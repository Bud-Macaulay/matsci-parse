import { Matrix, createMatrix } from "../matrix";

/**
 * Subtracts one matrix from another element-wise.
 *
 * Performs matrix subtraction: C = A - B, where each element of C is the difference
 * of the corresponding elements in A and B.
 *
 * @param a - The first matrix (minuend)
 * @param b - The second matrix (subtrahend)
 * @returns A new matrix containing the element-wise difference
 * @throws Error if the matrices have different dimensions
 *
 * @example
 * ```typescript
 * const a = createMatrix(2, 2, [5, 6, 7, 8]);
 * const b = createMatrix(2, 2, [1, 2, 3, 4]);
 * const result = sub(a, b);  // [[4, 4], [4, 4]]
 * ```
 */
export function sub(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error("Matrix dimensions must match");
  }

  const out = createMatrix(a.rows, a.cols);

  const length = a.data.length;

  for (let i = 0; i < length; i++) {
    out.data[i] = a.data[i] - b.data[i];
  }

  return out;
}
