import { Lattice, createLattice } from "./lattice";
import { inverse } from "./inverse";
import { transpose } from "../matrix/operations/transpose";

export function reciprocalLatticeCrystallographic(lattice: Lattice): Lattice {
  const inv = inverse(lattice);
  const invT = transpose(inv);

  return createLattice(invT.data);
}
