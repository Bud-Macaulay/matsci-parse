import { Lattice } from "./lattice";
import { inverse3x3 } from "../matrix/operations/inverse/inverse3x3";
import { Matrix } from "../matrix/matrix";

/** Compute the inverse of the lattice basis matrix. */
export function inverse(lattice: Lattice): Matrix {
  return inverse3x3(lattice.basis);
}
