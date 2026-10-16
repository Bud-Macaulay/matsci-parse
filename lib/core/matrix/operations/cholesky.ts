import { Matrix, createMatrix } from "../matrix";
import { EPSILON } from "../../math/constants";

/** Fail-soft Cholesky kernel over raw row-major n×n buffers: factors `G`
 * into `L` (preallocated, `L.length >= n*n`), returning `false` instead of
 * throwing when `G` is not positive definite. Only the lower triangle of `G`
 * is read. Backs {@link cholesky} and hot paths (e.g. Minkowski SVP
 * enumeration) that prefer a fallback over an exception. */
export function choleskyInto(
  G: Float64Array,
  n: number,
  L: Float64Array,
): boolean {
  L.fill(0, 0, n * n);

  for (let i = 0; i < n; i++) {
    const iOffset = i * n;

    for (let j = 0; j < i; j++) {
      const jOffset = j * n;
      let value = G[iOffset + j];

      for (let k = 0; k < j; k++) {
        value -= L[iOffset + k] * L[jOffset + k];
      }

      L[iOffset + j] = value / L[jOffset + j];
    }

    let value = G[iOffset + i];

    for (let k = 0; k < i; k++) {
      const lik = L[iOffset + k];
      value -= lik * lik;
    }

    // Also rejects NaN.
    if (!(value >= EPSILON) || value === Infinity) {
      return false;
    }

    L[iOffset + i] = Math.sqrt(value);
  }

  return true;
}

/** Compute the Cholesky decomposition of a symmetric positive-definite matrix (A = L Lᵀ).
 * @param A - Symmetric positive-definite matrix.
 * @returns The lower triangular matrix L. */
export function cholesky(A: Matrix): Matrix {
  if (A.rows !== A.cols) {
    throw new Error("Cholesky requires a square matrix");
  }

  const n = A.rows;
  const L = createMatrix(n, n);

  if (!choleskyInto(A.data, n, L.data)) {
    throw new Error("Matrix is not positive definite");
  }

  return L;
}
