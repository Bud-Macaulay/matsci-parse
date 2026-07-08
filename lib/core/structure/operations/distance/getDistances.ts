import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { distanceSquared } from "./utils";
import { getDisplacement } from "./getDisplacement";

/** Distances from site `idx` to every other site. */
export function getDistances(structure: Structure, idx: number): Float64Array {
  const n = structure.sites.length;
  const out = new Float64Array(n);

  const G = metricTensor(structure.lattice).data;

  for (let j = 0; j < n; j++) {
    if (j === idx) {
      out[j] = 0;
      continue;
    }

    const disp = getDisplacement(structure, idx, j);

    out[j] = Math.sqrt(distanceSquared(disp, G));
  }

  return out;
}
