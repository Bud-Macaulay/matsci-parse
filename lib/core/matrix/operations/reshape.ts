import { Matrix } from "../matrix";

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
