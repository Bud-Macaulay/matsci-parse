import { determinant } from "../matrix/operations/determinant";
import { Lattice } from "./lattice";

/**
 * Computes the volume of a unit cell defined by a lattice.
 *
 * @param lattice - The lattice for which to compute the volume.
 *
 * @returns The volume of the unit cell, calculated as the absolute value of the
 *          determinant of the lattice basis matrix: |det(A)|.
 *
 * @remarks
 * The volume is always positive, regardless of the lattice basis orientation.
 * The formula used is: V = |**a** · (**b** × **c**)|, where **a**, **b**, **c** are the lattice vectors.
 * This is also known as the scalar triple product.
 *
 * @example
 * ```typescript
 * // Cubic lattice with edge length 5 Ångströms
 * const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
 * const vol = volume(lattice);
 * // vol = 125 (Ångströms)³
 * ```
 */
/**
 * Computes the volume of the unit cell defined by the lattice.
 *
 * The volume is the absolute value of the determinant of the basis matrix.
 * It represents the volume of the parallelepiped formed by the three basis vectors.
 *
 * @param lattice - The crystal lattice
 * @returns The unit cell volume
 *
 * @remarks
 * - Volume is always non-negative
 * - For cubic: V = a³
 * - For orthorhombic: V = a × b × c
 * - General case: V = |det(basis)|
 * - Used in density calculations and structure normalization
 *
 * @example
 * ```typescript
 * const lattice = cubic(4);
 * const vol = volume(lattice);  // 64
 * ```
 */
export function volume(lattice: Lattice): number {
  return Math.abs(determinant(lattice.basis));
}
