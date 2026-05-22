import { Matrix, createMatrix } from "../matrix";

/**
 * Computes the Hadamard (element-wise) product of two matrices.
 *
 * The Hadamard product multiplies corresponding elements of two matrices,
 * resulting in a matrix of the same shape as the inputs.
 *
 * @param a - The first matrix
 * @param b - The second matrix
 * @returns A new matrix containing the element-wise product
 * @throws Error if the matrices have different dimensions
 *
 * @remarks
 * Unlike standard matrix multiplication, the Hadamard product does not require
 * matching inner dimensions and is commutative.
 *
 * @example
 * ```typescript
 * const a = createMatrix(2, 2, [1, 2, 3, 4]);
 * const b = createMatrix(2, 2, [5, 6, 7, 8]);
 * const result = hadamard(a, b);  // [[5, 12], [21, 32]]
 * ```
 */
export function hadamard(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error("Shape mismatch");
  }

  const out = createMatrix(a.rows, a.cols);

  for (let i = 0; i < a.data.length; i++) {
    out.data[i] = a.data[i] * b.data[i];
  }

  return out;
}
