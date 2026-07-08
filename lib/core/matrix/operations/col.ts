import { Matrix } from "../matrix";
import { clone } from "../matrix";

/** Extract column c from matrix m as a Float64Array.
 * @param m - Input matrix.
 * @param c - Column index.
 * @returns A Float64Array containing the column values. */
export function col(m: Matrix, c: number): Float64Array {
  const out = new Float64Array(m.rows);

  for (let r = 0; r < m.rows; r++) {
    out[r] = m.data[r * m.cols + c];
  }

  return out;
}

/** Return a copy of matrix m with column c replaced by vector v.
 * @param m - Input matrix.
 * @param c - Column index.
 * @param v - Replacement values.
 * @returns A new Matrix with the replaced column. */
export function replaceCol(m: Matrix, c: number, v: ArrayLike<number>): Matrix {
  const out = clone(m);

  for (let r = 0; r < out.rows; r++) {
    out.data[r * out.cols + c] = v[r];
  }

  return out;
}
