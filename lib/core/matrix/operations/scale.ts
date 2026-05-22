import { Matrix, createMatrix } from "../matrix";

/**
 * Scales a matrix by multiplying all elements by a scalar value.
 *
 * Performs scalar multiplication: B = k × A, where each element of B is
 * the corresponding element of A multiplied by the scalar k.
 *
 * @param m - The matrix to scale
 * @param k - The scalar multiplier
 * @returns A new matrix with all elements scaled by k
 *
 * @example
 * ```typescript
 * const m = createMatrix(2, 2, [1, 2, 3, 4]);
 * const result = scale(m, 2);  // [[2, 4], [6, 8]]
 * ```
 */
export function scale(m: Matrix, k: number): Matrix {
  const out = createMatrix(m.rows, m.cols);

  const size = m.data.length;

  for (let i = 0; i < size; i++) {
    out.data[i] = m.data[i] * k;
  }

  return out;
}
