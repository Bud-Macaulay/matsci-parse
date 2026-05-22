import { Matrix } from "../matrix";

/**
 * Computes the Frobenius norm of a matrix.
 *
 * The Frobenius norm is the element-wise L2 norm, computed as the square root
 * of the sum of squares of all matrix elements. It measures the overall magnitude
 * of the matrix and is useful for error analysis and convergence criteria.
 *
 * @param matrix - The matrix to compute the norm for
 * @returns The Frobenius norm (always non-negative)
 *
 * @remarks
 * The Frobenius norm is equivalent to the norm of the matrix when viewed as a vector.
 *
 * @example
 * ```typescript
 * const m = createMatrix(2, 2, [3, 4, 0, 0]);
 * const norm = frobeniusNorm(m);  // sqrt(9 + 16) = 5
 * ```
 */
export function frobeniusNorm(matrix: Matrix): number {
  let sum = 0;

  for (let i = 0; i < matrix.data.length; i++) {
    const v = matrix.data[i];
    sum += v * v;
  }

  return Math.sqrt(sum);
}
