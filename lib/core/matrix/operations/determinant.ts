import { Matrix } from "../matrix";
import { lu } from "./lu";

/** Compute the determinant of a square matrix using LU decomposition (O(n³)).
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

  const { LU, sign, singular } = lu(matrix);

  if (singular) return 0;

  const data = LU.data;
  let det = sign;

  for (let i = 0; i < n; i++) {
    det *= data[i * n + i];
  }

  return det;
}
