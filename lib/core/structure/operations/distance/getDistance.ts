import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { distanceSquared } from "./utils";
import { getDisplacement } from "./getDisplacement";

/** Minimum-image distance between two sites. */
export function getDistance(
  structure: Structure,
  idx1: number,
  idx2: number,
): number {
  const displacement = getDisplacement(structure, idx1, idx2);

  const G = metricTensor(structure.lattice).data;

  return Math.sqrt(distanceSquared(displacement, G));
}
