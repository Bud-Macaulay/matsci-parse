import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { minimumImage, distanceSquared, Vec3 } from "./utils";

export function getDistances(structure: Structure, idx: number): Float64Array {
  const n = structure.sites.length;
  const out = new Float64Array(n);

  const s1 = structure.sites[idx];
  const G = metricTensor(structure.lattice).data;

  for (let j = 0; j < n; j++) {
    if (j === idx) {
      out[j] = 0;
      continue;
    }

    const s2 = structure.sites[j];

    const df: Vec3 = [
      s1.frac[0] - s2.frac[0],
      s1.frac[1] - s2.frac[1],
      s1.frac[2] - s2.frac[2],
    ];

    const mic = minimumImage(df);

    out[j] = Math.sqrt(distanceSquared(mic, G));
  }

  return out;
}
