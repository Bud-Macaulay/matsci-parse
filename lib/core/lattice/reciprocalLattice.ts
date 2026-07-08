import { Lattice } from "./lattice";
import { inverse } from "./inverse";
import { transpose } from "../matrix/operations/transpose";
import { createMatrix } from "../matrix/matrix";
import { createLattice } from "./lattice";

const TWO_PI = 2 * Math.PI;

/** Compute the reciprocal lattice scaled by 2*pi. */
export function reciprocalLattice(lattice: Lattice): Lattice {
  const inv = inverse(lattice);
  const invT = transpose(inv);

  const data = invT.data.map((v) => v * TWO_PI);

  return createLattice(data);
}
