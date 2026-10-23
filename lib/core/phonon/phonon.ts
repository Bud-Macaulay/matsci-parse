/**
 * First-class phonon band structure data model.
 *
 * A phonon dispersion sampled along a q-point path: the structure, the
 * q-points, and for every q-point the frequency and eigenvector of each mode.
 * Code-specific formats (QE matdyn.modes, the PhononVis JSON, ...) are handled
 * by adapters in `lib/core/io/phonon/` that convert into / out of this type.
 *
 * Bulk numeric data lives in flat, row-major Float64Arrays rather than nested
 * arrays: a large dispersion is three allocations instead of millions of
 * small arrays, and a single mode's eigenvector is a contiguous slice.
 *
 * Units: frequencies in cm⁻¹ (imaginary modes negative, as written by QE);
 * q-points in fractional coordinates of the reciprocal of `structure.lattice`.
 */

import type { Structure } from "../structure/structure";
import type { Site } from "../site/site";
import { getElement } from "../data/periodictable/atomicData";

/** A named q-point on the path, e.g. `{ index: 0, label: "Γ" }`. */
export interface QPointLabel {
  readonly index: number;
  readonly label: string;
}

/** A phonon band structure along a q-point path. */
export interface PhononBands {
  readonly structure: Structure;
  readonly nqpts: number;
  /** Number of modes per q-point: 3 × number of sites. */
  readonly nmodes: number;
  /** [nqpts × 3]: fractional reciprocal coordinates of each q-point. */
  readonly qpoints: Float64Array;
  /** [nqpts × nmodes]: mode frequencies in cm⁻¹. */
  readonly frequencies: Float64Array;
  /**
   * [nqpts × nmodes × nsites × 3 × 2]: complex Cartesian components
   * (re, im) of each mode, as written by the source code. For QE
   * matdyn.modes these are mass-scaled displacement patterns.
   */
  readonly eigenvectors: Float64Array;
  /**
   * Labelled q-points, sorted by index. Two consecutive indices with
   * different labels mark a discontinuity in the path (e.g. "C" at 35 and
   * "C_2" at 36: the path jumps between them).
   */
  readonly labels: readonly QPointLabel[];
}

/** One complex Cartesian vector: [[re, im], [re, im], [re, im]]. */
export type ComplexVec3 = [[number, number], [number, number], [number, number]];

/** Create a PhononBands, validating array sizes against the structure. */
export function createPhononBands(params: {
  structure: Structure;
  qpoints: Float64Array | ArrayLike<number>;
  frequencies: Float64Array | ArrayLike<number>;
  eigenvectors: Float64Array | ArrayLike<number>;
  labels?: readonly QPointLabel[];
}): PhononBands {
  const { structure } = params;
  const qpoints = Float64Array.from(params.qpoints);
  const frequencies = Float64Array.from(params.frequencies);
  const eigenvectors = Float64Array.from(params.eigenvectors);

  const nsites = structure.sites.length;
  const nmodes = 3 * nsites;
  if (qpoints.length % 3 !== 0) {
    throw new Error("qpoints length must be a multiple of 3");
  }
  const nqpts = qpoints.length / 3;
  if (frequencies.length !== nqpts * nmodes) {
    throw new Error(
      `Expected ${nqpts * nmodes} frequencies (${nqpts} q-points × ${nmodes} modes), got ${frequencies.length}`,
    );
  }
  if (eigenvectors.length !== nqpts * nmodes * nmodes * 2) {
    throw new Error(
      `Expected ${nqpts * nmodes * nmodes * 2} eigenvector components, got ${eigenvectors.length}`,
    );
  }

  const labels = [...(params.labels ?? [])].sort((a, b) => a.index - b.index);
  for (const { index } of labels) {
    if (!Number.isInteger(index) || index < 0 || index >= nqpts) {
      throw new Error(`Label index ${index} out of range [0, ${nqpts})`);
    }
  }

  return { structure, nqpts, nmodes, qpoints, frequencies, eigenvectors, labels };
}

/** Fractional coordinates of q-point `q`. */
export function qpoint(bands: PhononBands, q: number): [number, number, number] {
  const o = 3 * q;
  return [bands.qpoints[o], bands.qpoints[o + 1], bands.qpoints[o + 2]];
}

/** Frequencies of one band (mode index `mode`) along the whole path. */
export function bandFrequencies(bands: PhononBands, mode: number): Float64Array {
  const out = new Float64Array(bands.nqpts);
  for (let q = 0; q < bands.nqpts; q++) {
    out[q] = bands.frequencies[q * bands.nmodes + mode];
  }
  return out;
}

/**
 * Eigenvector of one mode at one q-point, as a zero-copy view of length
 * nsites × 3 × 2 laid out [site][xyz][re, im].
 */
export function modeEigenvectorView(
  bands: PhononBands,
  q: number,
  mode: number,
): Float64Array {
  const size = bands.nmodes * 2;
  const start = (q * bands.nmodes + mode) * size;
  return bands.eigenvectors.subarray(start, start + size);
}

/**
 * Eigenvector of one mode at one q-point as nested arrays, one complex
 * Cartesian vector per site (the shape viewers such as WEAS consume).
 */
export function modeEigenvector(
  bands: PhononBands,
  q: number,
  mode: number,
): ComplexVec3[] {
  const v = modeEigenvectorView(bands, q, mode);
  const out: ComplexVec3[] = [];
  for (let o = 0; o < v.length; o += 6) {
    out.push([
      [v[o], v[o + 1]],
      [v[o + 2], v[o + 3]],
      [v[o + 4], v[o + 5]],
    ]);
  }
  return out;
}

/**
 * Atomic mass (amu) of a site: `site.properties.mass` (e.g. as read from
 * phonopy), else `species.properties.mass`, else the periodic table value.
 */
export function siteMass(site: Site): number {
  const mass = site.properties?.mass ?? site.species.properties?.mass ?? getElement(site.species.symbol)?.mass;
  if (typeof mass !== "number") {
    throw new Error(`No mass for species '${site.species.symbol}': set site.properties.mass`);
  }
  return mass;
}

/** Atomic masses (amu) of every site of a structure; see {@link siteMass}. */
export function siteMasses(structure: Structure): Float64Array {
  return Float64Array.from(structure.sites, siteMass);
}
