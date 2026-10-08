import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";
import { micDisplacement } from "./utils";
/** A 3-component vector. */
export type Vec3 = Float64Array;

/** Minimum-image displacement vector from site idx1 to site idx2.
 *
 * Uses the metric-tensor 27-image search, so the returned vector is the true
 * shortest periodic displacement even for skewed cells (per-component
 * wrapping alone picks the wrong image there). */
export function getDisplacement(
  structure: Structure,
  idx1: number,
  idx2: number,
): Vec3 {
  const s1 = structure.sites[idx1];
  const s2 = structure.sites[idx2];

  const G = metricTensor(structure.lattice).data;

  return micDisplacement(
    new Float64Array([
      s2.frac[0] - s1.frac[0],
      s2.frac[1] - s1.frac[1],
      s2.frac[2] - s1.frac[2],
    ]),
    G,
  );
}
