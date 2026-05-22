import { norm } from "../matrix/operations/vector/norm";
import { Lattice } from "./lattice";

/**
 * Computes the lengths (magnitudes) of the three lattice vectors.
 *
 * @param lattice - The lattice to compute edge lengths for.
 *
 * @returns A tuple [a, b, c] containing the lengths of the three lattice vectors.
 *          - **a**: Length of the first lattice vector
 *          - **b**: Length of the second lattice vector
 *          - **c**: Length of the third lattice vector
 *
 * @remarks
 * In crystallographic notation, these lengths are typically denoted as |**a**|, |**b**|, and |**c**|,
 * and are usually measured in Ångströms (Å) or picometers (pm).
 *
 * @example
 * ```typescript
 * const lattice = createLattice([5, 0, 0, 0, 6, 0, 0, 0, 7]);
 * const [a, b, c] = lengths(lattice);
 * // a = 5, b = 6, c = 7
 * ```
 */
/**
 * Computes the lengths (magnitudes) of lattice vectors.
 *
 * Returns the three edge lengths in crystallography notation: a, b, c.
 * These represent the magnitudes of the three basis vectors.
 *
 * @param lattice - The crystal lattice
 * @returns A tuple [a, b, c] with the edge lengths
 *
 * @remarks
 * - Lengths are always positive
 * - Used with angles to fully specify lattice geometry
 * - Combined with angles(), provides the lattice parameters
 * - For cubic systems: a = b = c
 *
 * @example
 * ```typescript
 * const lattice = cubic(4.5);
 * const [a, b, c] = lengths(lattice);
 * console.log(a);  // 4.5
 * ```
 */
export function lengths(lattice: Lattice): [number, number, number] {
  const m = lattice.basis.data;

  const a: Float64Array = new Float64Array([m[0], m[1], m[2]]);
  const b: Float64Array = new Float64Array([m[3], m[4], m[5]]);
  const c: Float64Array = new Float64Array([m[6], m[7], m[8]]);

  return [norm(a), norm(b), norm(c)];
}
