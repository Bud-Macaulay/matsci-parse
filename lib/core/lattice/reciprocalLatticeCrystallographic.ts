import { Lattice, createLattice } from "./lattice";
import { inverse } from "./inverse";
import { transpose } from "../matrix/operations/transpose";

/**
 * Computes the reciprocal lattice without 2π scaling (crystallographic convention).
 *
 * @param lattice - The real-space lattice for which to compute the reciprocal lattice.
 *
 * @returns A new Lattice object representing the reciprocal lattice without 2π scaling.
 *
 * @remarks
 * The reciprocal lattice in crystallographic convention (no 2π):
 * - **Crystallographic convention**: No 2π scaling (this function)
 * - **Physics convention**: Uses 2π scaling (see {@link reciprocalLattice})
 *
 * Formula: b_i = (a_j × a_k) / V, where i, j, k are cyclic indices and V is the cell volume
 *
 * This convention is standard in crystallography (IUCr) where reciprocal lattice vectors
 * are directly used for indexing planes via Miller indices (h, k, l).
 *
 * Relationship with physics convention: b_cryst = b_physics / (2π)
 *
 * Applications in crystallography:
 * - Miller index calculations
 * - d-spacing determinations
 * - Structure factor computations
 * - Bragg's law calculations
 *
 * @example
 * ```typescript
 * const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
 * const recipCryst = reciprocalLatticeCrystallographic(lattice);
 * // For cubic with a=5: reciprocal vectors have length 1/5
 * ```
 */
/**
 * Computes the reciprocal lattice without 2π scaling (crystallography convention).
 *
 * Similar to reciprocalLattice() but uses crystallography convention where
 * reciprocal vectors b_i* satisfy: b_i* · a_j = δ_ij (without 2π).
 *
 * @param lattice - The real-space crystal lattice
 * @returns A new Lattice object representing the reciprocal lattice
 *
 * @remarks
 * - Uses crystallography convention (no 2π scaling)
 * - Reciprocal lattice vectors are (A⁻¹)^T
 * - Used in crystallographic software and databases
 * - For physics convention with 2π, use reciprocalLattice()
 * - Related to structure factor calculations and diffraction
 *
 * @example
 * ```typescript
 * const real = cubic(4);
 * const recip = reciprocalLatticeCrystallographic(real);
 * const recipParams = parameters(recip);
 * // For cubic: reciprocal is also cubic with a* = 1/a
 * ```
 */
export function reciprocalLatticeCrystallographic(lattice: Lattice): Lattice {
  const inv = inverse(lattice);
  const invT = transpose(inv);

  return createLattice(invT.data);
}
