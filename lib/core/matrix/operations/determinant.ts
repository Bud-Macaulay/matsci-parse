import { Matrix, createMatrix, index } from "../matrix";

function minor(matrix: Matrix, skipRow: number, skipCol: number): Matrix {
  const out = createMatrix(matrix.rows - 1, matrix.cols - 1);

  let ptr = 0;

  for (let row = 0; row < matrix.rows; row++) {
    if (row === skipRow) continue;

    for (let col = 0; col < matrix.cols; col++) {
      if (col === skipCol) continue;

      out.data[ptr++] = matrix.data[index(matrix.cols, row, col)];
    }
  }

  return out;
}

/** Compute the determinant of a square matrix using Laplace expansion.
 * @param matrix - A square matrix.
 * @returns The determinant value. */
export function determinant(matrix: Matrix): number {
  if (matrix.rows !== matrix.cols) {
    throw new Error("Determinant requires a square matrix");
  }

  const n = matrix.rows;

  // fast path for BZ / geometry
  if (n === 3) {
    const m = matrix.data;

    return (
      m[0] * (m[4] * m[8] - m[5] * m[7]) -
      m[1] * (m[3] * m[8] - m[5] * m[6]) +
      m[2] * (m[3] * m[7] - m[4] * m[6])
    );
  }

  if (n === 1) {
    return matrix.data[0];
  }

  if (n === 2) {
    return matrix.data[0] * matrix.data[3] - matrix.data[1] * matrix.data[2];
  }

  let det = 0;

  for (let col = 0; col < n; col++) {
    const sign = col % 2 === 0 ? 1 : -1;

    det += sign * matrix.data[col] * determinant(minor(matrix, 0, col));
  }

  return det;
}
