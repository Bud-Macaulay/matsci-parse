import { Matrix } from "../matrix";
import { index } from "../matrix";

/**
 * Computes the trace of a matrix.
 *
 * The trace is the sum of the diagonal elements. Only defined for square matrices.
 *
 * @param m - The matrix (must be square)
 * @returns The sum of diagonal elements
 * @throws Error if the matrix is not square
 *
 * @remarks
 * For a matrix A, trace(A) = a₀₀ + a₁₁ + a₂₂ + ... + aₙₙ
 * Used in linear algebra, spectral analysis, and control theory.
 *
 * @example
 * ```typescript
 * const m = createMatrix(3, 3, [1, 0, 0, 0, 2, 0, 0, 0, 3]);
 * const tr = trace(m);  // 6
 * ```
 */
export function trace(m: Matrix): number {
  if (m.rows !== m.cols) {
    throw new Error("Trace requires a square matrix");
  }

  let sum = 0;

  for (let i = 0; i < m.rows; i++) {
    sum += m.data[index(m.cols, i, i)];
  }

  return sum;
}
