import { Structure } from "../../structure";
import { composition } from "../../properties/formula";
import { gcd } from "../../../math/numeric";
import { metricTensor } from "../../../lattice/metricTensor";
import { getSymmetry } from "./spglib";
import { canonicalize } from "../canonicalize";
import { minimumImage, distanceSquared } from "../distance/utils";

export interface StructureMatchResult {
  matches: boolean;
  rms: number | null;
  maxDistance: number | null;
  distances: Float64Array | null;
}

interface SiteMatch {
  distances: Float64Array;
  rms: number;
  maxDistance: number;
}

function reducedComposition(
  composition: Record<string, number>,
): Record<string, number> {
  const counts = Object.values(composition);

  if (counts.length === 0) {
    return {};
  }

  const factor = counts.reduce((a, b) => gcd(a, b));
  const reduced: Record<string, number> = {};

  for (const [element, count] of Object.entries(composition)) {
    reduced[element] = count / factor;
  }

  return reduced;
}

function sameComposition(
  compositionA: Record<string, number>,
  compositionB: Record<string, number>,
): boolean {
  const elementsA = Object.keys(compositionA).sort();
  const elementsB = Object.keys(compositionB).sort();

  if (elementsA.length !== elementsB.length) {
    return false;
  }

  return elementsA.every(
    (element, index) =>
      element === elementsB[index] &&
      compositionA[element] === compositionB[element],
  );
}

function translationBetween(a: Float64Array, b: Float64Array): Float64Array {
  return new Float64Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

function translateStructure(
  structure: Structure,
  translation: Float64Array,
): Structure {
  return {
    ...structure,
    sites: structure.sites.map((site) => ({
      ...site,
      frac: new Float64Array([
        site.frac[0] + translation[0],
        site.frac[1] + translation[1],
        site.frac[2] + translation[2],
      ]),
    })),
  };
}

/** Return the minimum-image distance between two sites. */
function distanceBetweenSites(
  structure: Structure,
  fracA: Float64Array,
  fracB: Float64Array,
): number {
  const displacement = minimumImage([
    fracB[0] - fracA[0],
    fracB[1] - fracA[1],
    fracB[2] - fracA[2],
  ]);

  const G = metricTensor(structure.lattice).data;

  return Math.sqrt(distanceSquared(displacement, G));
}

/** Find the closest species-preserving site mapping. */
function matchSites(
  structureA: Structure,
  structureB: Structure,
): SiteMatch | null {
  if (structureA.sites.length !== structureB.sites.length) {
    return null;
  }

  const used = new Set<number>();
  const distances = new Float64Array(structureA.sites.length);

  for (let i = 0; i < structureA.sites.length; i++) {
    const siteA = structureA.sites[i];

    let bestIndex = -1;
    let bestDistance = Infinity;

    for (let j = 0; j < structureB.sites.length; j++) {
      if (used.has(j)) {
        continue;
      }

      const siteB = structureB.sites[j];

      if (siteA.species.symbol !== siteB.species.symbol) {
        continue;
      }

      const distance = distanceBetweenSites(structureA, siteA.frac, siteB.frac);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = j;
      }
    }

    if (bestIndex === -1) {
      return null;
    }

    used.add(bestIndex);
    distances[i] = bestDistance;
  }

  let sumSquared = 0;
  let maxDistance = 0;

  for (const distance of distances) {
    sumSquared += distance * distance;
    maxDistance = Math.max(maxDistance, distance);
  }

  return {
    distances,
    rms: Math.sqrt(sumSquared / distances.length),
    maxDistance,
  };
}

function noMatch(): StructureMatchResult {
  return {
    matches: false,
    rms: null,
    maxDistance: null,
    distances: null,
  };
}

/** Match structures using symmetry-normalized primitive cells. */
export async function matchStructures(
  structureA: Structure,
  structureB: Structure,
  tolerance = 0.3,
): Promise<StructureMatchResult> {
  const reducedA = reducedComposition(composition(structureA));
  const reducedB = reducedComposition(composition(structureB));

  if (!sameComposition(reducedA, reducedB)) {
    return noMatch();
  }

  const [symmetryA, symmetryB] = await Promise.all([
    getSymmetry(structureA),
    getSymmetry(structureB),
  ]);

  const a = canonicalize(symmetryA.primitive);
  const b = canonicalize(symmetryB.primitive);

  if (a.sites.length !== b.sites.length) {
    return noMatch();
  }

  if (a.sites.length === 0) {
    return {
      matches: true,
      rms: 0,
      maxDistance: 0,
      distances: new Float64Array(),
    };
  }

  const anchorA = a.sites[0];
  let bestMatch: SiteMatch | null = null;

  for (const candidateB of b.sites) {
    if (candidateB.species.symbol !== anchorA.species.symbol) {
      continue;
    }

    const translation = translationBetween(anchorA.frac, candidateB.frac);

    const translatedB = canonicalize(translateStructure(b, translation));

    const current = matchSites(a, translatedB);

    if (
      current !== null &&
      (bestMatch === null || current.rms < bestMatch.rms)
    ) {
      bestMatch = current;
    }
  }

  if (bestMatch === null) {
    return noMatch();
  }

  return {
    matches: bestMatch.maxDistance <= tolerance,
    rms: bestMatch.rms,
    maxDistance: bestMatch.maxDistance,
    distances: bestMatch.distances,
  };
}
