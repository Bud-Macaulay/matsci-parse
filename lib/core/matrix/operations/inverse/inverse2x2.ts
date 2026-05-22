import { Matrix, createMatrix } from "../../matrix";

/**
 * Computes the inverse of a 2×2 matrix.
 *
 * Uses the analytical formula for 2×2 matrix inversion, which is fast and numerically stable.
 *
 * @param m - The 2×2 matrix to invert
 * @returns The inverted matrix
 * @throws Error if the matrix is not 2×2
 * @throws Error if the matrix is singular (determinant is 0)
 *
 * @remarks
 * For a matrix [[a, b], [c, d]], the inverse is (1/det) * [[d, -b], [-c, a]],
 * where det = ad - bc.
 *
 * @example
 * ```typescript
 * const m = createMatrix(2, 2, [1, 2, 3, 4]);
 * const inv = inverse2x2(m);
 * ```
 */
export function inverse2x2(m: Matrix): Matrix {
  if (m.rows !== 2 || m.cols !== 2) {
    throw new Error("Expected 2x2 matrix");
  }

  const a = m.data[0];
  const b = m.data[1];
  const c = m.data[2];
  const d = m.data[3];

  const det = a * d - b * c;

  if (det === 0) {
    throw new Error("Singular matrix");
  }

  const invDet = 1 / det;

  const out = createMatrix(2, 2);

  out.data[0] = d * invDet;
  out.data[1] = -b * invDet;
  out.data[2] = -c * invDet;
  out.data[3] = a * invDet;

  return out;
}
