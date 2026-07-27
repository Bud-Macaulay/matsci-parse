import { Lattice } from "./lattice";
import { reciprocalLatticeCrystallographic } from "./reciprocalLatticeCrystallographic";
import { lengths } from "./lengths";

/** Compute k-point grid [Nx, Ny, Nz] from desired spacing in Å⁻¹. */
export function kspacingToGrid(
  lattice: Lattice,
  spacing: number,
): [number, number, number] {
  if (spacing <= 0) {
    throw new Error("k-spacing must be positive");
  }

  const rec = reciprocalLatticeCrystallographic(lattice);
  const [b1, b2, b3] = lengths(rec);

  return [
    Math.max(1, Math.ceil((b1 * 2 * Math.PI) / spacing)),
    Math.max(1, Math.ceil((b2 * 2 * Math.PI) / spacing)),
    Math.max(1, Math.ceil((b3 * 2 * Math.PI) / spacing)),
  ];
}
