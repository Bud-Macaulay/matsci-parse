import { Matrix, createMatrix } from "../matrix";

export function sub(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error("Matrix dimensions must match");
  }

  const out = createMatrix(a.rows, a.cols);

  const length = a.data.length;

  for (let i = 0; i < length; i++) {
    out.data[i] = a.data[i] - b.data[i];
  }

  return out;
}
