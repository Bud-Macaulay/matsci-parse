import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { Vec3, minimumImage } from "../distance/utils";

const RAD2DEG = 57.2957795;

// Decide whether this is a fundamental prop
function metricDot(a: Vec3, b: Vec3, G: number[]) {
  return (
    a[0] * (G[0] * b[0] + G[1] * b[1] + G[2] * b[2]) +
    a[1] * (G[3] * b[0] + G[4] * b[1] + G[5] * b[2]) +
    a[2] * (G[6] * b[0] + G[7] * b[1] + G[8] * b[2])
  );
}

export function getAngle(
  structure: Structure,
  idx1: number,
  idx2: number,
  idx3: number,
): number {
  const s1 = structure.sites[idx1];
  const s2 = structure.sites[idx2];
  const s3 = structure.sites[idx3];

  const v1 = minimumImage([
    s1.frac[0] - s2.frac[0],
    s1.frac[1] - s2.frac[1],
    s1.frac[2] - s2.frac[2],
  ]);

  const v2 = minimumImage([
    s3.frac[0] - s2.frac[0],
    s3.frac[1] - s2.frac[1],
    s3.frac[2] - s2.frac[2],
  ]);

  const G = metricTensor(structure.lattice).data;

  const vv1 = metricDot(v1, v1, G);
  const vv2 = metricDot(v2, v2, G);
  const v1v2 = metricDot(v1, v2, G);

  if (vv1 === 0 || vv2 === 0) {
    return 0; // or NaN, but 0 is safer for structural workflows
  }

  let cos = v1v2 / Math.sqrt(vv1 * vv2);

  // numerical clamp
  cos = Math.max(-1, Math.min(1, cos));

  const angle = Math.acos(cos);

  return angle * RAD2DEG;
}
