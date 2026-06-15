import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { Vec3, distanceSquared, minimumImage } from "./utils";

export function getDistancesMatrix(structure: Structure): Float64Array[] {
  const n = structure.sites.length;

  const matrix: Float64Array[] = Array.from(
    { length: n },
    () => new Float64Array(n),
  );

  const G = metricTensor(structure.lattice).data;

  for (let i = 0; i < n; i++) {
    const si = structure.sites[i];

    for (let j = i; j < n; j++) {
      const sj = structure.sites[j];

      if (i === j) {
        matrix[i][j] = 0;
        continue;
      }

      const df: Vec3 = [
        si.frac[0] - sj.frac[0],
        si.frac[1] - sj.frac[1],
        si.frac[2] - sj.frac[2],
      ];

      const mic = minimumImage(df);

      const d = Math.sqrt(distanceSquared(mic, G));

      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  return matrix;
}
