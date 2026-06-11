import { Matrix, createMatrix, index } from "../matrix";

export function transpose(matrix: Matrix): Matrix {
  const out = createMatrix(matrix.cols, matrix.rows);

  for (let row = 0; row < matrix.rows; row++) {
    for (let col = 0; col < matrix.cols; col++) {
      out.data[index(out.cols, col, row)] =
        matrix.data[index(matrix.cols, row, col)];
    }
  }

  return out;
}
