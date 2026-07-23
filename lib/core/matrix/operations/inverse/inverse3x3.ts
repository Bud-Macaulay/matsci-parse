import { Matrix, createMatrix } from "../../matrix";
import { EPSILON } from "../../../math/constants";

/** Compute the inverse of a 3x3 matrix using cofactors.
 * @param m - A 3x3 matrix.
 * @returns The inverse Matrix. */
export function inverse3x3(m: Matrix): Matrix {
  if (m.rows !== 3 || m.cols !== 3) {
    throw new Error("Expected 3x3 matrix");
  }

  const a00 = m.data[0],
    a01 = m.data[1],
    a02 = m.data[2];
  const a10 = m.data[3],
    a11 = m.data[4],
    a12 = m.data[5];
  const a20 = m.data[6],
    a21 = m.data[7],
    a22 = m.data[8];

  const c00 = a11 * a22 - a12 * a21;
  const c01 = a12 * a20 - a10 * a22;
  const c02 = a10 * a21 - a11 * a20;

  const c10 = a02 * a21 - a01 * a22;
  const c11 = a00 * a22 - a02 * a20;
  const c12 = a01 * a20 - a00 * a21;

  const c20 = a01 * a12 - a02 * a11;
  const c21 = a02 * a10 - a00 * a12;
  const c22 = a00 * a11 - a01 * a10;

  const det = a00 * c00 + a01 * c01 + a02 * c02;

  if (Math.abs(det) < EPSILON) {
    throw new Error("Singular matrix");
  }

  const invDet = 1 / det;

  const out = createMatrix(3, 3);

  out.data[0] = c00 * invDet;
  out.data[1] = c10 * invDet;
  out.data[2] = c20 * invDet;

  out.data[3] = c01 * invDet;
  out.data[4] = c11 * invDet;
  out.data[5] = c21 * invDet;

  out.data[6] = c02 * invDet;
  out.data[7] = c12 * invDet;
  out.data[8] = c22 * invDet;

  return out;
}
