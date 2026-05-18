import { createMatrix } from "../matrix/matrix";
import { dot } from "../matrix/operations/vector/dot";
import { norm } from "../matrix/operations/vector/norm";
import { Lattice } from "./lattice";

function angle(u: number[], v: number[]) {
  return Math.acos(dot(u, v) / (norm(u) * norm(v)));
}

export function angles(lattice: Lattice): [number, number, number] {
  const m = lattice.basis.data;

  const a = createMatrix(3, 1, [m[0], m[1], m[2]]);
  const b = createMatrix(3, 1, [m[3], m[4], m[5]]);
  const c = createMatrix(3, 1, [m[6], m[7], m[8]]);

  const alpha = angle(b, c);
  const beta = angle(a, c);
  const gamma = angle(a, b);

  return [alpha, beta, gamma];
}
