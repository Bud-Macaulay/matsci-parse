import { Matrix, createMatrix } from "../matrix";

const EPSILON = 1e-12;

/** Compute the Cholesky decomposition of a symmetric positive-definite matrix (A = L Lᵀ).
 * @param A - Symmetric positive-definite matrix.
 * @returns The lower triangular matrix L. */
export function cholesky(A: Matrix): Matrix {
  if (A.rows !== A.cols) {
    throw new Error("Cholesky requires a square matrix");
  }

  const n = A.rows;
  const L = createMatrix(n, n);
  const ld = L.data;

  for (let j = 0; j < n; j++) {
    let sum = 0;

    for (let k = 0; k < j; k++) {
      sum += ld[j * n + k] * ld[j * n + k];
    }

    const val = A.data[j * n + j] - sum;

    if (val < -EPSILON) {
      throw new Error("Matrix is not positive definite");
    }

    if (val < EPSILON) {
      ld[j * n + j] = 0;
    } else {
      ld[j * n + j] = Math.sqrt(val);
    }

    const diag = ld[j * n + j];

    if (diag <= 0) {
      throw new Error("Matrix is not positive definite");
    }

    for (let i = j + 1; i < n; i++) {
      let sum2 = 0;

      for (let k = 0; k < j; k++) {
        sum2 += ld[i * n + k] * ld[j * n + k];
      }

      ld[i * n + j] = (A.data[i * n + j] - sum2) / diag;
    }
  }

  return L;
}
