import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { Vec3, distanceSquared, minimumImage } from "./utils";

export function getDistance(structure, idx1, idx2): number {
  const s1 = structure.sites[idx1];
  const s2 = structure.sites[idx2];

  const df: Vec3 = [
    s1.frac[0] - s2.frac[0],
    s1.frac[1] - s2.frac[1],
    s1.frac[2] - s2.frac[2],
  ];

  const mic = minimumImage(df);

  const G = metricTensor(structure.lattice).data;

  const x = mic[0],
    y = mic[1],
    z = mic[2];

  const d2 =
    x * (G[0] * x + G[1] * y + G[2] * z) +
    y * (G[3] * x + G[4] * y + G[5] * z) +
    z * (G[6] * x + G[7] * y + G[8] * z);

  return Math.sqrt(d2);
}
