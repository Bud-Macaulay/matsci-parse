import { determinant } from "../matrix/operations/determinant";
import { Lattice } from "./lattice";

export function volume(lattice: Lattice): number {
  return Math.abs(determinant(lattice.basis));
}
