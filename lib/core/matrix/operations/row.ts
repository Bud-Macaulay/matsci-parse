import { Matrix } from "../matrix";

/** Extract row r from matrix m as a Float64Array.
 * @param m - Input matrix.
 * @param r - Row index.
 * @returns A Float64Array slice of the row. */
export function row(m: Matrix, r: number): Float64Array {
  const start = r * m.cols;
  return m.data.slice(start, start + m.cols);
}
