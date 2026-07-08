import { Matrix } from "../matrix";

const EPSILON = 1e-12;

/** Check whether the matrix is square. */
export function isSquare(m: Matrix): boolean {
  return m.rows === m.cols;
}

/** Check whether the matrix is symmetric (A = Aᵀ).
 * Square matrices only; non-square returns false. */
export function isSymmetric(m: Matrix): boolean {
  if (m.rows !== m.cols) return false;

  const n = m.rows;

  for (let r = 0; r < n; r++) {
    for (let c = r + 1; c < n; c++) {
      if (Math.abs(m.data[r * n + c] - m.data[c * n + r]) > EPSILON) {
        return false;
      }
    }
  }

  return true;
}

/** Check whether the matrix is diagonal (all off-diagonal entries are zero). */
export function isDiagonal(m: Matrix): boolean {
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      if (r !== c && Math.abs(m.data[r * m.cols + c]) > EPSILON) {
        return false;
      }
    }
  }

  return true;
}

/** Check whether the matrix is the identity matrix.
 * Non-square matrices return false. */
export function isIdentity(m: Matrix): boolean {
  if (m.rows !== m.cols) return false;

  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      const expected = r === c ? 1 : 0;

      if (Math.abs(m.data[r * m.cols + c] - expected) > EPSILON) {
        return false;
      }
    }
  }

  return true;
}
