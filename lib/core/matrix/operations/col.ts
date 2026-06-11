import { Matrix } from "../matrix";

export function col(m: Matrix, c: number): Float64Array {
  const out = new Float64Array(m.rows);

  for (let r = 0; r < m.rows; r++) {
    out[r] = m.data[r * m.cols + c];
  }

  return out;
}

export function setCol(m: Matrix, c: number, v: ArrayLike<number>) {
  for (let r = 0; r < m.rows; r++) {
    m.data[r * m.cols + c] = v[r];
  }

  return m;
}
