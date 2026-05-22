import { transpose } from "../matrix/operations/transpose";
import { mul } from "../matrix/operations/mul";
import { Lattice } from "./lattice";
import { Matrix } from "../matrix/matrix";

/**
 * Computes the metric tensor of a lattice.
 *
 * @param lattice - The lattice for which to compute the metric tensor.
 *
 * @returns A 3x3 Matrix representing the metric tensor G = A^T × A,
 *          where A is the lattice basis matrix.
 *
 * @remarks
 * The metric tensor is a fundamental quantity in crystallography that encodes all
 * geometric information about the lattice:
 * - Diagonal elements: G_ii = |v_i|² (squared lengths of lattice vectors)
 * - Off-diagonal elements: G_ij = v_i · v_j (dot products of vector pairs)
 * - The determinant of G equals the square of the lattice volume: det(G) = V²
 * - The metric tensor is symmetric: G_ij = G_ji
 *
 * The metric tensor is widely used in:
 * - Calculating distances between atoms
 * - Computing reciprocal lattice properties
 * - Crystallographic computations (Miller indices, d-spacings)
 *
 * @example
 * ```typescript
 * const lattice = createLattice([5, 0, 0, 0, 5, 0, 0, 0, 5]);
 * const G = metricTensor(lattice);
 * // For cubic: G = [[25, 0, 0], [0, 25, 0], [0, 0, 25]]
 * console.log(G.data); // [25, 0, 0, 0, 25, 0, 0, 0, 25]
 * ```
 */
/**
 * Computes the metric tensor of a lattice.
 *
 * The metric tensor G is defined as G = A^T × A, where A is the basis matrix.
 * It encodes all geometric information about the lattice (distances, angles, volume).
 *
 * @param lattice - The crystal lattice
 * @returns The 3×3 metric tensor matrix
 *
 * @remarks
 * - The metric tensor is always symmetric and positive-definite
 * - Diagonal elements: G[i,i] = |v_i|² (squared edge lengths)
 * - Off-diagonal: G[i,j] = v_i · v_j = |v_i||v_j|cos(angle)
 * - Used in reciprocal space calculations and structure analysis
 * - Inverse of metric tensor gives reciprocal metric tensor
 *
 * @example
 * ```typescript
 * const lattice = cubic(4);
 * const G = metricTensor(lattice);
 * // For cubic: G[0,0] = G[1,1] = G[2,2] = 16 (4²)
 * // Off-diagonal elements = 0
 * ```
 */
export function metricTensor(lattice: Lattice): Matrix {
  const A = lattice.basis;

  const AT = transpose(A);
  return mul(AT, A);
}
