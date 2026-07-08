import { Matrix } from "../matrix";

/** Compute the 1-norm (maximum absolute column sum) of a matrix.
 * @param m - Input matrix.
 * @returns The 1-norm. */
export function norm1(m: Matrix): number {
  let max = 0;

  for (let c = 0; c < m.cols; c++) {
    let sum = 0;

    for (let r = 0; r < m.rows; r++) {
      sum += Math.abs(m.data[r * m.cols + c]);
    }

    if (sum > max) max = sum;
  }

  return max;
}

/** Compute the infinity-norm (maximum absolute row sum) of a matrix.
 * @param m - Input matrix.
 * @returns The infinity-norm. */
export function normInf(m: Matrix): number {
  let max = 0;

  for (let r = 0; r < m.rows; r++) {
    const row = r * m.cols;
    let sum = 0;

    for (let c = 0; c < m.cols; c++) {
      sum += Math.abs(m.data[row + c]);
    }

    if (sum > max) max = sum;
  }

  return max;
}
