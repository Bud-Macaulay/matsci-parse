import { Matrix } from "../matrix";

/** Reshape a matrix to new dimensions without copying the underlying data.
 * @param matrix - Input matrix.
 * @param rows - New row count.
 * @param cols - New column count.
 * @returns A new Matrix view sharing the same data buffer. */
export function reshape(matrix: Matrix, rows: number, cols: number): Matrix {
  if (rows * cols !== matrix.data.length) {
    throw new Error("Total element count must stay the same");
  }

  return {
    rows,
    cols,
    data: matrix.data, // same underlying buffer
  };
}
