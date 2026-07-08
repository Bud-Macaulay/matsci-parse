import { determinant } from "../matrix/operations/determinant";
import { Lattice } from "./lattice";

/** Compute the unit cell volume as the absolute determinant of the basis. */
export function volume(lattice: Lattice): number {
  return Math.abs(determinant(lattice.basis));
}
