import { Structure } from "../../structure/structure";
import { composition } from "../../properties/formula";
import { gcd } from "../../../math/numeric";
import { canonicalize } from "../canonicalize";
import { getSymmetry } from "./spglib";
import { assignSites } from "./assign";
import { applyTransformationBasis } from "../applyTransformationBasis";
import { metricTensor } from "../../../lattice/metricTensor";
import { createMatrix } from "@/core/matrix/matrix";
import type { Matrix } from "@/core/matrix/matrix";

export interface StructureMatchResult {
  matches: boolean;
  rms: number | null;
  maxDistance: number | null;
  distances: Float64Array | null;
}

interface SiteMatch {
  rms: number;
  maxDistance: number;
  distances: Float64Array;
}

function reducedComposition(
  comp: Record<string, number>,
): Record<string, number> {
  const counts = Object.values(comp);

  if (counts.length === 0) {
    return {};
  }

  const factor = counts.reduce((a, b) => gcd(a, b));
  const reduced: Record<string, number> = {};

  for (const [element, count] of Object.entries(comp)) {
    reduced[element] = count / factor;
  }

  return reduced;
}

function sameComposition(
  compA: Record<string, number>,
  compB: Record<string, number>,
): boolean {
  const elementsA = Object.keys(compA).sort();
  const elementsB = Object.keys(compB).sort();

  if (elementsA.length !== elementsB.length) {
    return false;
  }

  return elementsA.every(
    (element, index) =>
      element === elementsB[index] && compA[element] === compB[element],
  );
}

function noMatch(): StructureMatchResult {
  return {
    matches: false,
    rms: null,
    maxDistance: null,
    distances: null,
  };
}

function wrapComponent(x: number): number {
  const v = x - Math.floor(x);
  return Math.abs(v) < 1e-12 ? 0 : v;
}

/** Apply a symmetry operation (rotation + translation, in fractional lattice
 *  coordinates) to a structure's sites, keeping its lattice unchanged. */
function applySymmetryOperation(
  structure: Structure,
  rotation: number[],
  translation: number[],
): Structure {
  const sites = structure.sites.map((site) => {
    const f = site.frac;
    const x =
      rotation[0] * f[0] +
      rotation[1] * f[1] +
      rotation[2] * f[2] +
      translation[0];
    const y =
      rotation[3] * f[0] +
      rotation[4] * f[1] +
      rotation[5] * f[2] +
      translation[1];
    const z =
      rotation[6] * f[0] +
      rotation[7] * f[1] +
      rotation[8] * f[2] +
      translation[2];

    return {
      ...site,
      frac: new Float64Array([
        wrapComponent(x),
        wrapComponent(y),
        wrapComponent(z),
      ]),
    };
  });

  return { ...structure, sites };
}

/** Apply a constant fractional translation to a structure's sites. */
function translateStructure(
  structure: Structure,
  translation: number[],
): Structure {
  return {
    ...structure,
    sites: structure.sites.map((site) => {
      const f = site.frac;
      return {
        ...site,
        frac: new Float64Array([
          wrapComponent(f[0] + translation[0]),
          wrapComponent(f[1] + translation[1]),
          wrapComponent(f[2] + translation[2]),
        ]),
      };
    }),
  };
}

/**
 * Distinct global translations that could align `candidate` onto `a`.
 *
 * Anchors a site belonging to the least-common shared species in `a` and
 * aligns it to every same-species site in `candidate`. The true alignment is
 * always recovered by one of these translations, while choosing the rarest
 * shared species minimizes the number of candidates that must be tested.
 */
function candidateTranslations(a: Structure, candidate: Structure): number[][] {
  const candidateSpecies = new Set(
    candidate.sites.map((site) => site.species.symbol),
  );

  // Pick the shared species with the fewest sites in `a`.
  const counts = new Map<string, number>();

  for (const site of a.sites) {
    const symbol = site.species.symbol;

    if (candidateSpecies.has(symbol)) {
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
  }

  let anchorSpecies = "";
  let anchorCount = Infinity;

  for (const [symbol, count] of counts) {
    if (count < anchorCount) {
      anchorSpecies = symbol;
      anchorCount = count;
    }
  }

  if (!anchorSpecies) return [];

  const anchorIndex = a.sites.findIndex(
    (site) => site.species.symbol === anchorSpecies,
  );

  if (anchorIndex < 0) return [];

  const fa = a.sites[anchorIndex].frac;
  const seen = new Set<string>();
  const out: number[][] = [];

  for (const site of candidate.sites) {
    if (site.species.symbol !== anchorSpecies) continue;

    const fb = site.frac;

    const t = [
      wrapComponent(fa[0] - fb[0]),
      wrapComponent(fa[1] - fb[1]),
      wrapComponent(fa[2] - fb[2]),
    ];

    const key = `${t[0].toFixed(4)},${t[1].toFixed(4)},${t[2].toFixed(4)}`;

    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }

  return out;
}

/** The 6 lattice-vector permutation matrices (row permutations). */
function latticePermutations(): Matrix[] {
  const perms: number[][] = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];

  return perms.map((perm) => {
    const data = new Float64Array(9);
    for (let r = 0; r < 3; r++) {
      data[r * 3 + perm[r]] = 1;
    }
    return createMatrix(3, 3, data);
  });
}

/**
 * All integer rotation matrices (entries in {-1, 0, 1}, determinant ±1) that
 * preserve the lattice metric `G`. This is the full lattice point group — a
 * superset of the space-group rotations returned by symmetry analysis and
 * robust to the basis/origin choices made by cell standardization.
 */
function latticePointGroup(G: Float64Array): number[][] {
  const values = [-1, 0, 1];
  const out: number[][] = [];

  for (let idx = 0; idx < 19683; idx++) {
    const M = new Array<number>(9);
    let x = idx;
    for (let k = 0; k < 9; k++) {
      M[k] = values[x % 3];
      x = Math.floor(x / 3);
    }

    const det =
      M[0] * (M[4] * M[8] - M[5] * M[7]) -
      M[1] * (M[3] * M[8] - M[5] * M[6]) +
      M[2] * (M[3] * M[7] - M[4] * M[6]);

    if (det !== 1 && det !== -1) continue;

    let preserves = true;
    for (let r = 0; r < 3 && preserves; r++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            s += M[r * 3 + i] * G[i * 3 + j] * M[c * 3 + j];
          }
        }
        if (Math.abs(s - G[r * 3 + c]) > 1e-6) {
          preserves = false;
          break;
        }
      }
    }

    if (preserves) out.push(M);
  }

  return out;
}

/**
 * Match two structures using symmetry-normalized primitive cells, mirroring the
 * behaviour of pymatgen's `StructureMatcher` (primitive-cell matching with
 * symmetry-operation search and RMS tolerance).
 */
export async function matchStructures(
  structureA: Structure,
  structureB: Structure,
  tolerance = 0.3,
  symprec = 1e-4,
): Promise<StructureMatchResult> {
  const reducedA = reducedComposition(composition(structureA));
  const reducedB = reducedComposition(composition(structureB));

  if (!sameComposition(reducedA, reducedB)) {
    return noMatch();
  }

  const [symmetryA, symmetryB] = await Promise.all([
    getSymmetry(structureA, symprec),
    getSymmetry(structureB, symprec),
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

  // Candidate rotations: the full lattice point group of `a` (rotations that
  // preserve its metric). This covers all symmetry-equivalent placements of `b`
  // within `a`'s frame, regardless of the basis/origin choice made during
  // standardization.
  const G = metricTensor(a.lattice).data;
  const rotations = latticePointGroup(G);
  const permutations = latticePermutations();

  let best: SiteMatch | null = null;

  const consider = (candidate: Structure) => {
    const result = assignSites(a, candidate, tolerance);
    if (result === null) return;
    if (best === null || result.rms < best.rms) {
      best = {
        rms: result.rms,
        maxDistance: result.maxDistance,
        distances: result.distances,
      };
    }
  };

  const evaluate = (candidate: Structure): boolean => {
    // Direct placement (no extra translation) — resolves well-behaved cases.
    consider(candidate);
    if (best !== null && best.rms <= tolerance) return true;

    // Search the global translation that aligns the two (handles origin-choice
    // differences between standardized primitives).
    for (const t of candidateTranslations(a, candidate)) {
      consider(translateStructure(candidate, t));
      if (best !== null && best.rms <= tolerance) return true;
    }

    return false;
  };

  // Iterate over lattice-vector relabellings of `b` (covers basis-ordering
  // choices) combined with every lattice point-group rotation.
  for (let p = 0; p < permutations.length; p++) {
    const bPerm = p === 0 ? b : applyTransformationBasis(b, permutations[p]);

    for (const rotation of rotations) {
      if (evaluate(applySymmetryOperation(bPerm, rotation, [0, 0, 0]))) {
        return {
          matches: true,
          rms: best!.rms,
          maxDistance: best!.maxDistance,
          distances: best!.distances,
        };
      }
    }
  }

  if (best === null) {
    return noMatch();
  }

  return {
    matches: best.rms <= tolerance,
    rms: best.rms,
    maxDistance: best.maxDistance,
    distances: best.distances,
  };
}
