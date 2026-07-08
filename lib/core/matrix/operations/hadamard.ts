import { Matrix, createMatrix } from "../matrix";

/** Compute the Hadamard (element-wise) product of two matrices.
 * @param a - First matrix.
 * @param b - Second matrix.
 * @returns A new Matrix with element-wise products. */
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
