import { Matrix } from "../matrix";

/** Reshape a matrix to new dimensions.
 * @param matrix - Input matrix.
 * @param rows - New row count.
 * @param cols - New column count.
 * @returns A new Matrix with a copy of the data in the new shape. */
export function reshape(matrix: Matrix, rows: number, cols: number): Matrix {
  if (rows * cols !== matrix.data.length) {
    throw new Error("Total element count must stay the same");
  }

  return {
    rows,
    cols,
    data: new Float64Array(matrix.data),
  };
}
