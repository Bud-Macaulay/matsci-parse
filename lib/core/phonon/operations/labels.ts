import type { PhononBands } from "../phonon";
import type { GetPathOptions } from "../../structure/operations/symmetry/brilliounzone/seekpath";
import { labelPathCorners, labelPathHighSymmetry, pathCorners } from "../../kpoints/labelling";

/*
 * Naming the q-points of phonon band structures: wrappers over the
 * sampled-path labelling in `lib/core/kpoints/labelling.ts`.
 */

/**
 * Indices where the path changes direction, starts, ends or jumps, grouped
 * so that repeated visits to the same q-point share a group.
 */
export function cornerQPoints(bands: PhononBands): number[][] {
  return pathCorners(bands.qpoints, bands.structure.lattice);
}

/**
 * Label every corner of the path that has no label yet, with generic
 * "Q_n" labels shared by repeated visits. Existing labels are kept.
 */
export function labelCorners(bands: PhononBands): PhononBands {
  return { ...bands, qpoints: labelPathCorners(bands.qpoints, bands.structure.lattice) };
}

/**
 * Label q-points equivalent to the high-symmetry points of the crystal's
 * Brillouin zone (seekpath conventions), and remaining corners generically.
 * Replaces any existing labels; see {@link labelPathHighSymmetry}.
 */
export async function labelHighSymmetryPoints(
  bands: PhononBands,
  opts: GetPathOptions & { tolerance?: number } = {},
): Promise<PhononBands> {
  return { ...bands, qpoints: await labelPathHighSymmetry(bands.qpoints, bands.structure, opts) };
}
