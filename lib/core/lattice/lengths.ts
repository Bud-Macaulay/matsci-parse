import { createMatrix } from "../matrix/matrix";
import { norm } from "../matrix/operations/vector/norm";
import { Lattice } from "./lattice";

export function lengths(lattice: Lattice): [number, number, number] {
  const m = lattice.basis.data;

  const a = norm(createMatrix(3, 1, [m[0], m[1], m[2]]));
  const b = norm(createMatrix(3, 1, [m[3], m[4], m[5]]));
  const c = norm(createMatrix(3, 1, [m[6], m[7], m[8]]));

  return [a, b, c];
}
