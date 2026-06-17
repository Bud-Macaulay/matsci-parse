import { Structure } from "../../structure";
import { metricTensor } from "../../../lattice/metricTensor";

import { distanceSquared } from "./utils";
import { getDisplacement } from "./getDisplacement";

export function getDistancesMatrix(structure: Structure): Float64Array[] {
  const n = structure.sites.length;

  const matrix: Float64Array[] = Array.from(
    { length: n },
    () => new Float64Array(n),
  );

  const G = metricTensor(structure.lattice).data;

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 0;

    for (let j = i + 1; j < n; j++) {
      const disp = getDisplacement(structure, i, j);

      const d = Math.sqrt(distanceSquared(disp, G));

      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  return matrix;
}
