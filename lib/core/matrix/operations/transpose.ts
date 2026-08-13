import { Matrix, createMatrix, index } from "../matrix";

/** Transpose the given matrix (swap rows and columns).
 * @param matrix - Input matrix.
 * @returns A new transposed Matrix. */
export function transpose(matrix: Matrix): Matrix {
  const rows = matrix.rows;
  const cols = matrix.cols;

  const data = matrix.data;
  const out = createMatrix(cols, rows);
  const od = out.data;

  for (let row = 0; row < rows; row++) {
    const rowOffset = row * cols;

    for (let col = 0; col < cols; col++) {
      od[col * rows + row] = data[rowOffset + col];
    }
  }

  return out;
}
