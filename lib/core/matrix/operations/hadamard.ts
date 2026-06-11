import { Matrix, createMatrix } from "../matrix";

export function hadamard(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error("Shape mismatch");
  }

  const out = createMatrix(a.rows, a.cols);

  for (let i = 0; i < a.data.length; i++) {
    out.data[i] = a.data[i] * b.data[i];
  }

  return out;
}
