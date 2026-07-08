import { Matrix, createMatrix } from "../../matrix";

/** Compute the inverse of a 2x2 matrix using the closed-form formula.
 * @param m - A 2x2 matrix.
 * @returns The inverse Matrix. */
export function inverse2x2(m: Matrix): Matrix {
  if (m.rows !== 2 || m.cols !== 2) {
    throw new Error("Expected 2x2 matrix");
  }

  const a = m.data[0];
  const b = m.data[1];
  const c = m.data[2];
  const d = m.data[3];

  const det = a * d - b * c;

  if (Math.abs(det) < 1e-12) {
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
