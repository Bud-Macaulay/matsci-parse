import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { Vec3 } from "../distance/utils";
import { getDisplacement } from "../distance/getDisplacement";

const RAD2DEG = 180 / Math.PI;

function metricDot(a: Vec3, b: Vec3, G: ArrayLike<number>) {
  return (
    a[0] * (G[0] * b[0] + G[1] * b[1] + G[2] * b[2]) +
    a[1] * (G[3] * b[0] + G[4] * b[1] + G[5] * b[2]) +
    a[2] * (G[6] * b[0] + G[7] * b[1] + G[8] * b[2])
  );
}

/** Angle (degrees) about idx2 between the vectors idx2->idx1 and idx2->idx3. */
export function getAngle(
  structure: Structure,
  idx1: number,
  idx2: number,
  idx3: number,
): number {
  // vectors from vertex idx2
  const v1 = getDisplacement(structure, idx2, idx1);
  const v2 = getDisplacement(structure, idx2, idx3);

  const G = metricTensor(structure.lattice).data;

  const v1Sq = metricDot(v1, v1, G);
  const v2Sq = metricDot(v2, v2, G);

  if (v1Sq === 0 || v2Sq === 0) {
    return 0;
  }

  const dot = metricDot(v1, v2, G);

  let cosTheta = dot / Math.sqrt(v1Sq * v2Sq);

  cosTheta = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(cosTheta) * RAD2DEG;
}
