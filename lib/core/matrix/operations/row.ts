import { Matrix } from "../matrix";

export function row(m: Matrix, r: number): Float64Array {
  const start = r * m.cols;
  return m.data.slice(start, start + m.cols);
}
