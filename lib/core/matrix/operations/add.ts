import { createMatrix, type Matrix } from "../matrix";

/** Add two matrices element-wise.
 * @param a - First matrix.
 * @param b - Second matrix.
 * @returns A new Matrix containing the element-wise sum. */
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
