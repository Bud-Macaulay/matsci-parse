import { transpose } from "../matrix/operations/transpose";
import { mul } from "../matrix/operations/mul";
import { Lattice } from "./lattice";
import { Matrix } from "../matrix/matrix";

/** Compute the metric tensor G = A^T A for the lattice basis. */
export function metricTensor(lattice: Lattice): Matrix {
  const A = lattice.basis;

  const AT = transpose(A);
  return mul(AT, A);
}
