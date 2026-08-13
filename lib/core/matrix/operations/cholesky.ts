import { Matrix, createMatrix } from "../matrix";
import { EPSILON } from "../../math/constants";

/** Compute the Cholesky decomposition of a symmetric positive-definite matrix (A = L Lᵀ).
 * @param A - Symmetric positive-definite matrix.
 * @returns The lower triangular matrix L. */
export function cholesky(A: Matrix): Matrix {
  if (A.rows !== A.cols) {
    throw new Error("Cholesky requires a square matrix");
  }

  const n = A.rows;
  const L = createMatrix(n, n);

  const ad = A.data;
  const ld = L.data;

  for (let j = 0; j < n; j++) {
    const jOffset = j * n;

    let sum = 0;

    for (let k = 0; k < j; k++) {
      const ljk = ld[jOffset + k];
      sum += ljk * ljk;
    }

    const val = ad[jOffset + j] - sum;

    if (val < -EPSILON) {
      throw new Error("Matrix is not positive definite");
    }

    const diag = val < EPSILON ? 0 : Math.sqrt(val);

    if (diag <= 0) {
      throw new Error("Matrix is not positive definite");
    }

    ld[jOffset + j] = diag;

    for (let i = j + 1; i < n; i++) {
      const iOffset = i * n;
      let sum2 = 0;

      for (let k = 0; k < j; k++) {
        sum2 += ld[iOffset + k] * ld[jOffset + k];
      }

      ld[iOffset + j] = (ad[iOffset + j] - sum2) / diag;
    }
  }

  return L;
}
