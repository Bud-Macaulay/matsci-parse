import { Matrix, createMatrix } from "../matrix";

export function scale(m: Matrix, k: number): Matrix {
  const out = createMatrix(m.rows, m.cols);

  const size = m.data.length;

  for (let i = 0; i < size; i++) {
    out.data[i] = m.data[i] * k;
  }

  return out;
}
