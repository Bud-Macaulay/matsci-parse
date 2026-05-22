import { Matrix, clone } from "../matrix";

const EPS = 1e-12;

/**
 * Computes the rank of a matrix using Gaussian elimination.
 *
 * The rank is the dimension of the vector space spanned by the matrix's rows or columns.
 * It indicates the number of linearly independent rows/columns.
 *
 * @param m - The matrix
 * @returns The rank of the matrix
 *
 * @remarks
 * - For an m × n matrix, rank ≤ min(m, n)
 * - A full-rank square matrix is invertible
 * - Uses row reduction with epsilon threshold (1e-12) for numerical stability
 *
 * @example
 * ```typescript
 * const m = createMatrix(3, 3, [1, 2, 3, 2, 4, 6, 1, 1, 1]);
 * const r = rank(m);  // 2 (second row is a multiple of the first)
 * ```
 */
export function rank(m: Matrix): number {
  const A = clone(m).data;
  const rows = m.rows;
  const cols = m.cols;

  let r = 0;

  let leadCol = 0;

  for (let row = 0; row < rows && leadCol < cols; row++) {
    let pivotRow = row;

    // find pivot
    while (pivotRow < rows && Math.abs(A[pivotRow * cols + leadCol]) < EPS) {
      pivotRow++;
    }

    if (pivotRow === rows) {
      leadCol++;
      row--;
      continue;
    }

    // swap rows
    if (pivotRow !== row) {
      for (let j = 0; j < cols; j++) {
        const tmp = A[row * cols + j];
        A[row * cols + j] = A[pivotRow * cols + j];
        A[pivotRow * cols + j] = tmp;
      }
    }

    const pivotVal = A[row * cols + leadCol];

    // normalize + eliminate below
    for (let i = row + 1; i < rows; i++) {
      const factor = A[i * cols + leadCol] / pivotVal;

      if (Math.abs(factor) > EPS) {
        for (let j = leadCol; j < cols; j++) {
          A[i * cols + j] -= factor * A[row * cols + j];
        }
      }
    }

    r++;
    leadCol++;
  }

  return r;
}
