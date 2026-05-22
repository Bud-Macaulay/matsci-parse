import { createMatrix, type Matrix } from "../matrix";

/**
 * Adds two matrices element-wise.
 *
 * Performs matrix addition: C = A + B, where each element of C is the sum
 * of the corresponding elements in A and B.
 *
 * @param a - The first matrix
 * @param b - The second matrix
 * @returns A new matrix containing the element-wise sum
 * @throws Error if the matrices have different dimensions
 *
 * @example
 * ```typescript
 * const a = createMatrix(2, 2, [1, 2, 3, 4]);
 * const b = createMatrix(2, 2, [5, 6, 7, 8]);
 * const result = add(a, b);  // [[6, 8], [10, 12]]
 * ```
 */
export function add(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error("Matrix dimensions must match");
  }

  const out = createMatrix(a.rows, a.cols);

  const length = a.data.length;

  for (let i = 0; i < length; i++) {
    out.data[i] = a.data[i] + b.data[i];
  }

  return out;
}
