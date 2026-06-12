import { Matrix, createMatrix, clone } from "../../matrix";

const EPSILON = 1e-12;

export function luInverse(m: Matrix): Matrix {
  if (m.rows !== m.cols) {
    throw new Error("Square matrix required");
  }

  const n = m.rows;
  const LU = clone(m);
  const data = LU.data;

  // Pivot permutation vector
  const piv = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    piv[i] = i;
  }

  // LU factorization with partial pivoting
  for (let k = 0; k < n; k++) {
    // Find pivot row
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
      throw new Error("Singular matrix");
    }

    // Swap rows if needed
    if (pivot !== k) {
      const rowK = k * n;
      const rowP = pivot * n;
      for (let j = 0; j < n; j++) {
        let tmp = data[rowK + j];
        data[rowK + j] = data[rowP + j];
        data[rowP + j] = tmp;
      }
      let tmp = piv[k];
      piv[k] = piv[pivot];
      piv[pivot] = tmp;
    }

    // Elimination
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

  // Construct inverse - solve all columns at once
  const inv = createMatrix(n, n);
  const invData = inv.data;

  // Initialize with permuted identity matrix
  for (let i = 0; i < n; i++) {
    invData[i * n + piv[i]] = 1;
  }

  // Forward substitution on all columns simultaneously
  for (let i = 0; i < n; i++) {
    const rowI = i * n;
    for (let j = 0; j < i; j++) {
      const factor = data[rowI + j];
      const rowJ = j * n;
      for (let k = 0; k < n; k++) {
        invData[rowI + k] -= factor * invData[rowJ + k];
      }
    }
  }

  // Back substitution on all columns simultaneously
  for (let i = n - 1; i >= 0; i--) {
    const rowI = i * n;
    const diag = data[rowI + i];

    // Divide row by diagonal
    for (let k = 0; k < n; k++) {
      invData[rowI + k] /= diag;
    }

    // Eliminate from rows above
    for (let j = 0; j < i; j++) {
      const factor = data[j * n + i];
      const rowJ = j * n;
      for (let k = 0; k < n; k++) {
        invData[rowJ + k] -= factor * invData[rowI + k];
      }
    }
  }

  return inv;
}
