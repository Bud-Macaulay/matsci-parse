/**
 * First-class phonon data model.
 *
 * Phonon modes sampled at a set of q-points: the structure, the q-points,
 * and for every q-point the frequency and eigenvector of each mode. The
 * q-points are a {@link SampledKPoints}: along a path (a band structure,
 * {@link PhononBands}), on a full grid, or an unstructured list (a single
 * q-point, an irreducible mesh). Code-specific formats (QE matdyn.modes,
 * the PhononVis JSON, ...) are handled by adapters in `lib/core/io/phonon/`
 * that convert into / out of these types.
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
import {
  isSampledKPoints,
  kpointCoord,
  type KPointLabel,
  type SampledKPoints,
  type SampledPath,
} from "../kpoints/sampled";
import { labelPath, pathLabels, samplePath } from "../kpoints/path";

/** A named q-point on the path, e.g. `{ index: 0, label: "Γ" }`. */
export type QPointLabel = KPointLabel;

/** Phonon modes at a set of q-points. */
export interface PhononModes<Q extends SampledKPoints = SampledKPoints> {
  readonly structure: Structure;
  readonly nqpts: number;
  /** Number of modes per q-point: 3 × number of sites. */
  readonly nmodes: number;
  /** The q-points and how they are organised (path, grid or list). */
  readonly qpoints: Q;
  /** [nqpts × nmodes]: mode frequencies in cm⁻¹. */
  readonly frequencies: Float64Array;
  /**
   * [nqpts × nmodes × nsites × 3 × 2]: complex Cartesian components
   * (re, im) of each mode, as written by the source code, or null when the
   * source has none. For QE matdyn.modes these are mass-scaled
   * displacement patterns.
   */
  readonly eigenvectors: Float64Array | null;
}

/**
 * A phonon band structure: modes along a q-point path. Labels and path
 * breaks are those of the path (see {@link qpointLabels}).
 */
export type PhononBands = PhononModes<SampledPath>;

/** One complex Cartesian vector: [[re, im], [re, im], [re, im]]. */
export type ComplexVec3 = [[number, number], [number, number], [number, number]];

/** Whether the modes are sampled along a path. */
export function isPhononBands(modes: PhononModes): modes is PhononBands {
  return modes.qpoints.kind === "path";
}

/**
 * Create PhononModes, validating array sizes against the structure.
 *
 * Float64Array inputs are used as-is, not copied (the eigenvectors alone
 * can be hundreds of MB): the modes take ownership, so don't modify them
 * afterwards. Other array-likes are copied into new Float64Arrays.
 */
export function createPhononModes<Q extends SampledKPoints>(params: {
  structure: Structure;
  qpoints: Q;
  frequencies: Float64Array | ArrayLike<number>;
  eigenvectors?: Float64Array | ArrayLike<number> | null;
}): PhononModes<Q> {
  const { structure, qpoints } = params;
  const frequencies = asFloat64Array(params.frequencies);
  const eigenvectors = params.eigenvectors == null ? null : asFloat64Array(params.eigenvectors);

  const nsites = structure.sites.length;
  const nmodes = 3 * nsites;
  const nqpts = qpoints.nkpts;
  if (frequencies.length !== nqpts * nmodes) {
    throw new Error(
      `Expected ${nqpts * nmodes} frequencies (${nqpts} q-points × ${nmodes} modes), got ${frequencies.length}`,
    );
  }
  if (eigenvectors && eigenvectors.length !== nqpts * nmodes * nmodes * 2) {
    throw new Error(
      `Expected ${nqpts * nmodes * nmodes * 2} eigenvector components, got ${eigenvectors.length}`,
    );
  }

  return { structure, nqpts, nmodes, qpoints, frequencies, eigenvectors };
}

/**
 * Create PhononBands from a sampled path, or from bare q-point coordinates
 * ([nqpts × 3], fractional) and optional labels. Labels split the path as
 * {@link labelPath} describes: a labelled point is a corner, and two
 * labelled points in a row with different positions are a break (e.g.
 * "C" at 35, "C_2" at 36). See {@link createPhononModes}.
 */
export function createPhononBands(params: {
  structure: Structure;
  qpoints: SampledPath | Float64Array | ArrayLike<number>;
  labels?: readonly QPointLabel[];
  frequencies: Float64Array | ArrayLike<number>;
  eigenvectors?: Float64Array | ArrayLike<number> | null;
}): PhononBands {
  const { qpoints, labels } = params;
  let path: SampledPath;
  if (isSampledKPoints(qpoints)) {
    if (qpoints.kind !== "path") throw new Error(`PhononBands need a q-point path, got a ${qpoints.kind}`);
    path = labels ? labelPath(qpoints, labels) : qpoints;
  } else {
    path = samplePath(asFloat64Array(qpoints), labels);
  }
  return createPhononModes({ ...params, qpoints: path });
}

function asFloat64Array(a: Float64Array | ArrayLike<number>): Float64Array {
  return a instanceof Float64Array ? a : Float64Array.from(a);
}

/** Fractional coordinates of q-point `q`. */
export function qpoint(modes: PhononModes, q: number): [number, number, number] {
  return kpointCoord(modes.qpoints, q);
}

/** Labelled q-points of a band structure, sorted by index. */
export function qpointLabels(bands: PhononBands): QPointLabel[] {
  return pathLabels(bands.qpoints);
}

/**
 * The bands with their q-point labels replaced, splitting the path at
 * them (see {@link labelPath}). Does not modify `bands`.
 */
export function labelQPoints(bands: PhononBands, labels: Iterable<QPointLabel>): PhononBands {
  return { ...bands, qpoints: labelPath(bands.qpoints, labels) };
}

/** Frequencies of one band (mode index `mode`) at every q-point. */
export function bandFrequencies(modes: PhononModes, mode: number): Float64Array {
  const out = new Float64Array(modes.nqpts);
  for (let q = 0; q < modes.nqpts; q++) {
    out[q] = modes.frequencies[q * modes.nmodes + mode];
  }
  return out;
}

/**
 * Eigenvector of one mode at one q-point, as a zero-copy view of length
 * nsites × 3 × 2 laid out [site][xyz][re, im]. Throws if the modes have
 * no eigenvectors.
 */
export function modeEigenvectorView(
  modes: PhononModes,
  q: number,
  mode: number,
): Float64Array {
  if (!modes.eigenvectors) throw new Error("These phonon modes have no eigenvectors");
  const size = modes.nmodes * 2;
  const start = (q * modes.nmodes + mode) * size;
  return modes.eigenvectors.subarray(start, start + size);
}

/**
 * Eigenvector of one mode at one q-point as nested arrays, one complex
 * Cartesian vector per site (the shape viewers such as WEAS consume).
 */
export function modeEigenvector(
  modes: PhononModes,
  q: number,
  mode: number,
): ComplexVec3[] {
  const v = modeEigenvectorView(modes, q, mode);
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
