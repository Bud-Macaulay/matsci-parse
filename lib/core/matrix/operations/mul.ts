import { Matrix, createMatrix, index } from "../matrix";

/** Multiply two matrices (matrix product).
 * @param a - Left matrix.
 * @param b - Right matrix.
 * @returns A new Matrix containing the product. */
export function mul(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) {
    throw new Error("Invalid matrix multiplication dimensions");
  }

  const out = createMatrix(a.rows, b.cols);

  const aRows = a.rows;
  const aCols = a.cols;
  const bCols = b.cols;

  for (let row = 0; row < aRows; row++) {
    for (let col = 0; col < bCols; col++) {
      let sum = 0;

      for (let k = 0; k < aCols; k++) {
        sum += a.data[index(a.cols, row, k)] * b.data[index(b.cols, k, col)];
      }

      out.data[index(out.cols, row, col)] = sum;
    }
  }

  return out;
}
