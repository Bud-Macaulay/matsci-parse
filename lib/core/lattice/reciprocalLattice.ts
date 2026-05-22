import { Lattice } from "./lattice";
import { inverse } from "./inverse";
import { transpose } from "../matrix/operations/transpose";
import { createMatrix } from "../matrix/matrix";
import { createLattice } from "./lattice";

const TWO_PI = 2 * Math.PI;

/**
 * Computes the reciprocal lattice with 2π scaling (physics convention).
 *
 * @param lattice - The real-space lattice for which to compute the reciprocal lattice.
 *
 * @returns A new Lattice object representing the reciprocal lattice with 2π scaling.
 *
 * @remarks
 * The reciprocal lattice is fundamental in crystallography and solid-state physics:
 * - **Physics convention**: Uses 2π scaling (this function)
 * - **Crystallographic convention**: No 2π scaling (see {@link reciprocalLatticeCrystallographic})
 *
 * Formula: b_i = 2π × (a_j × a_k) / V, where i, j, k are cyclic indices and V is the cell volume
 *
 * The reciprocal lattice vectors are perpendicular to planes in the real lattice:
 * - **b** is perpendicular to the plane defined by **a** and **c**
 * - **c** is perpendicular to the plane defined by **a** and **b**
 * - **a** is perpendicular to the plane defined by **b** and **c**
 *
 * Applications:
 * - X-ray and neutron diffraction calculations
 * - Brillouin zone construction
 * - Phonon and electronic band structure
 *
 * @example
 * ```typescript
 * const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
 * const recip = reciprocalLattice(lattice);
 * // For cubic with a=5: reciprocal vectors have length 2π/5
 * ```
 */
/**
 * Computes the reciprocal lattice with 2π scaling (physics convention).
 *
 * The reciprocal lattice is the Fourier transform of the real lattice.
 * Reciprocal vectors b_i* satisfy: b_i* · a_j = 2π δ_ij (Kronecker delta).
 *
 * @param lattice - The real-space crystal lattice
 * @returns A new Lattice object representing the reciprocal lattice
 *
 * @remarks
 * - Uses physics convention with 2π scaling (common in solid-state physics)
 * - Reciprocal lattice vectors are obtained from (A⁻¹)^T × 2π
 * - Reciprocal of reciprocal ≈ original (up to 2π factors)
 * - Used in diffraction calculations (X-ray, neutron, electron)
 * - For crystallography convention without 2π, use reciprocalLatticeCrystallographic()
 *
 * @example
 * ```typescript
 * const real = cubic(4);
 * const recip = reciprocalLattice(real);
 * const recipParams = parameters(recip);
 * // For cubic: reciprocal is also cubic with a* = 2π/a
 * ```
 */
export function reciprocalLattice(lattice: Lattice): Lattice {
  const inv = inverse(lattice);
  const invT = transpose(inv);

  const data = invT.data.map((v) => v * TWO_PI);

  return createLattice(data);
}
