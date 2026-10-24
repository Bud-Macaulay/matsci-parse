import type { PhononBands, PhononModes } from "../phonon";
import { cartesianKPoints, pathBreaks as kpathBreaks, pathDistances } from "../../kpoints/path";

/*
 * Path geometry of phonon band structures: wrappers over the sampled-path
 * operations in `lib/core/kpoints/path.ts`.
 */

export { mergeLabels } from "../../kpoints/path";

/** Indices i where the path jumps from q-point i to i + 1. */
export function pathBreaks(bands: PhononBands): number[] {
  return kpathBreaks(bands.qpoints);
}

/** Cartesian q-points (Å⁻¹, crystallographic: no 2π), [nqpts × 3]. */
export function cartesianQPoints(modes: PhononModes): Float64Array {
  return cartesianKPoints(modes.qpoints, modes.structure.lattice);
}

/**
 * Cumulative path length at each q-point (Å⁻¹, crystallographic: no 2π),
 * the x-axis of a band structure plot. Across a path break the distance
 * does not advance, so the two sides of the jump share an x position.
 */
export function qpointDistances(bands: PhononBands): Float64Array {
  return pathDistances(bands.qpoints, bands.structure.lattice);
}
