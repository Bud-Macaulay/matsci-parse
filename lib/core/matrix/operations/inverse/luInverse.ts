import { Matrix, createMatrix } from "../../matrix";
import { lu } from "../lu";

/** Compute the inverse of a square matrix via LU decomposition with partial pivoting.
 * @param m - A square matrix.
 * @returns The inverse Matrix. */
export function luInverse(m: Matrix): Matrix {
  if (m.rows !== m.cols) {
    throw new Error("Square matrix required");
  }

  const n = m.rows;
  const { LU, piv, singular } = lu(m);

  if (singular) {
    throw new Error("Singular matrix");
  }

  const data = LU.data;

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
