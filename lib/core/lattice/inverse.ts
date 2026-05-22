import { Lattice } from "./lattice";
import { inverse3x3 } from "../matrix/operations/inverse/inverse3x3";
import { Matrix } from "../matrix/matrix";

/**
 * Computes the inverse of a lattice basis matrix.
 *
 * @param lattice - The lattice for which to compute the inverse.
 *
 * @returns A 3x3 Matrix representing the inverse of the lattice basis matrix (A^{-1}).
 *
 * @remarks
 * The inverse lattice basis is used to:
 * - Construct the reciprocal lattice (when combined with a 2π scaling)
 * - Convert between real space and reciprocal space coordinates
 * - Compute crystallographic quantities like d-spacings and scattering angles
 *
 * The relationship is: A^{-1} × A = I (identity matrix)
 *
 * @throws Will throw an error if the lattice basis matrix is singular (determinant = 0).
 *
 * @example
 * ```typescript
 * const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
 * const inv = inverse(lattice);
 * // For this cubic lattice: inv = [[0.2, 0, 0], [0, 0.2, 0], [0, 0, 0.2]]
 * ```
 */
/**
 * Computes the inverse of the lattice basis matrix.
 *
 * The inverse matrix maps from Cartesian coordinates to fractional (crystal) coordinates.
 * This is fundamental for coordinate transformations in crystallography.
 *
 * @param lattice - The crystal lattice
 * @returns The inverse of the basis matrix (3×3)
 * @throws Error if the lattice basis is singular
 *
 * @remarks
 * - If B = A⁻¹ (inverse), then B × r_cartesian = r_fractional
 * - Used for converting Cartesian to fractional coordinates
 * - Uses analytical 3×3 matrix inversion for speed and stability
 * - Related to reciprocal lattice calculations
 *
 * @example
 * ```typescript
 * const lattice = cubic(4);
 * const inv = inverse(lattice);
 * // inv × [4, 0, 0] = [1, 0, 0] in fractional coordinates
 * ```
 */
export function inverse(lattice: Lattice): Matrix {
  return inverse3x3(lattice.basis);
}
