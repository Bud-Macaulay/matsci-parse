import { Matrix, createMatrix, clone, index } from "../../matrix";

/**
 * Computes the matrix inverse using Gauss-Jordan elimination.
 *
 * This method augments the matrix with an identity matrix and performs
 * row operations to transform the original matrix to identity while
 * simultaneously transforming the augmented identity to the inverse.
 *
 * @param m - The square matrix to invert
 * @returns The inverted matrix
 * @throws Error if the matrix is not square
 * @throws Error if the matrix is singular
 *
 * @remarks
 * - Time complexity: O(n³)
 * - Uses partial pivoting to improve numerical stability
 * - Alternative to LU decomposition
 * - Good for small to medium-sized matrices
 *
 * @example
 * ```typescript
 * const m = createMatrix(3, 3, [1, 2, 1, 2, 1, 0, 1, 0, 2]);
 * const inv = gjInverse(m);
 * ```
 */
export function gjInverse(m: Matrix): Matrix {
  if (m.rows !== m.cols) {
    throw new Error("Inverse requires square matrix");
  }

  const n = m.rows;
  const A = clone(m);
  const I = createMatrix(n, n);
  const Adata = A.data;
  const Idata = I.data;

  // Initialize identity
  for (let i = 0; i < n; i++) {
    Idata[i * n + i] = 1;
  }

  for (let i = 0; i < n; i++) {
    let pivotIdx = i * n + i;

    // Pivoting
    if (Adata[pivotIdx] === 0) {
      let swapRow = -1;
      for (let r = i + 1; r < n; r++) {
        if (Adata[r * n + i] !== 0) {
          swapRow = r;
          break;
        }
      }
      if (swapRow === -1) {
        throw new Error("Singular matrix");
      }

      // performant inline swap
      const r1Offset = i * n;
      const r2Offset = swapRow * n;
      for (let c = 0; c < n; c++) {
        let tmp = Adata[r1Offset + c];
        Adata[r1Offset + c] = Adata[r2Offset + c];
        Adata[r2Offset + c] = tmp;

        tmp = Idata[r1Offset + c];
        Idata[r1Offset + c] = Idata[r2Offset + c];
        Idata[r2Offset + c] = tmp;
      }

      pivotIdx = i * n + i;
    }

    const pivot = Adata[pivotIdx];
    const invPivot = 1 / pivot;

    // Normalize pivot row
    const pivotOffset = i * n;
    for (let c = 0; c < n; c++) {
      Adata[pivotOffset + c] *= invPivot;
      Idata[pivotOffset + c] *= invPivot;
    }

    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r === i) continue;

      const factor = Adata[r * n + i];
      if (factor === 0) continue; // Skip if already zero

      const rOffset = r * n;
      for (let c = 0; c < n; c++) {
        Adata[rOffset + c] -= Adata[pivotOffset + c] * factor;
        Idata[rOffset + c] -= Idata[pivotOffset + c] * factor;
      }
    }
  }

  return I;
}
