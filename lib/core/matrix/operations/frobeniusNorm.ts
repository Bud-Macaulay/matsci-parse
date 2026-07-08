import { Matrix } from "../matrix";

/** Compute the Frobenius norm (sqrt of sum of squared elements) of a matrix.
 * @param matrix - Input matrix.
 * @returns The Frobenius norm. */
export function frobeniusNorm(matrix: Matrix): number {
  let sum = 0;

  for (let i = 0; i < matrix.data.length; i++) {
    const v = matrix.data[i];
    sum += v * v;
  }

  return Math.sqrt(sum);
}
