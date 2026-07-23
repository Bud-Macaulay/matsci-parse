import { Matrix, clone } from "../matrix";

import { EPSILON } from "../../math/constants";

export interface LUDecomposition {
  readonly LU: Matrix;
  readonly piv: Int32Array;
  readonly sign: number;
  readonly singular: boolean;
}

/** Compute the LU decomposition of a square matrix with partial pivoting.
 * @param A - A square matrix.
 * @returns The LU decomposition. */
export function lu(A: Matrix): LUDecomposition {
  if (A.rows !== A.cols) {
    throw new Error("LU decomposition requires a square matrix");
  }

  const n = A.rows;
  const LU = clone(A);
  const data = LU.data;
  const piv = new Int32Array(n);

  for (let i = 0; i < n; i++) piv[i] = i;

  let sign = 1;

  for (let k = 0; k < n; k++) {
    let pivot = k;
    let max = Math.abs(data[k * n + k]);

    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(data[i * n + k]);

      if (v > max) {
        max = v;
        pivot = i;
      }
    }

    if (max < EPSILON) {
      return { LU, piv, sign, singular: true };
    }

    if (pivot !== k) {
      const rowK = k * n;
      const rowP = pivot * n;

      for (let j = 0; j < n; j++) {
        const tmp = data[rowK + j];
        data[rowK + j] = data[rowP + j];
        data[rowP + j] = tmp;
      }

      const tmp = piv[k];
      piv[k] = piv[pivot];
      piv[pivot] = tmp;
      sign = -sign;
    }

    const rowK = k * n;
    const pivotVal = data[rowK + k];

    for (let i = k + 1; i < n; i++) {
      const rowI = i * n;

      data[rowI + k] /= pivotVal;
      const factor = data[rowI + k];

      for (let j = k + 1; j < n; j++) {
        data[rowI + j] -= factor * data[rowK + j];
      }
    }
  }

  return { LU, piv, sign, singular: false };
}
