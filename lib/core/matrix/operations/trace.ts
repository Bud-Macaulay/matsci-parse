import { Matrix } from "../matrix";
import { index } from "../matrix";

export function trace(m: Matrix): number {
  if (m.rows !== m.cols) {
    throw new Error("Trace requires a square matrix");
  }

  let sum = 0;

  for (let i = 0; i < m.rows; i++) {
    sum += m.data[index(m.cols, i, i)];
  }

  return sum;
}
