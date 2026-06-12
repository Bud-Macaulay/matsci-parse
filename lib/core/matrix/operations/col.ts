import { Matrix } from "../matrix";
import { clone } from "../matrix";

export function col(m: Matrix, c: number): Float64Array {
  const out = new Float64Array(m.rows);

  for (let r = 0; r < m.rows; r++) {
    out[r] = m.data[r * m.cols + c];
  }

  return out;
}

export function replaceCol(m: Matrix, c: number, v: ArrayLike<number>): Matrix {
  const out = clone(m);

  for (let r = 0; r < out.rows; r++) {
    out.data[r * out.cols + c] = v[r];
  }

  return out;
}
