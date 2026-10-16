import { gram } from "../matrix/operations/gram";
import { Lattice } from "./lattice";
import { Matrix } from "../matrix/matrix";

/** Compute the metric tensor G = A A^T for the lattice basis (row vectors). */
export function metricTensor(lattice: Lattice): Matrix {
  return gram(lattice.basis);
}
