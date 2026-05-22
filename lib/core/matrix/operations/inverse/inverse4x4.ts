import { Matrix, createMatrix } from "../../matrix";

/**
 * Computes the inverse of a 4×4 matrix.
 *
 * Uses an optimized analytical formula for 4×4 matrices,
 * which is more efficient than general LU decomposition for this size.
 *
 * @param m - The 4×4 matrix to invert
 * @returns The inverted matrix
 * @throws Error if the matrix is not 4×4
 * @throws Error if the matrix is singular (determinant is 0)
 *
 * @remarks
 * Commonly used in computer graphics and transformations (projection, rotation, etc.).
 *
 * @example
 * ```typescript
 * const m = createMatrix(4, 4, [...]);  // Homogeneous transformation matrix
 * const inv = inverse4x4(m);
 * ```
 */
export function inverse4x4(m: Matrix): Matrix {
  if (m.rows !== 4 || m.cols !== 4) {
    throw new Error("Expected 4x4 matrix");
  }

  const a = m.data;

  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  const a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  const det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (det === 0) {
    throw new Error("Singular matrix");
  }

  const invDet = 1 / det;

  const out = createMatrix(4, 4);
  const o = out.data;

  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
  o[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
  o[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;

  o[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
  o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
  o[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
  o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;

  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
  o[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
  o[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;

  o[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
  o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
  o[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
  o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

  return out;
}
