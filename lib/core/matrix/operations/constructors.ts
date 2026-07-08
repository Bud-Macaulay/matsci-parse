import { Matrix, createMatrix } from "../matrix";

/** Create a matrix of zeros. */
export function zeros(rows: number, cols: number): Matrix {
  return createMatrix(rows, cols);
}

/** Create a matrix of ones. */
export function ones(rows: number, cols: number): Matrix {
  return createMatrix(rows, cols, new Float64Array(rows * cols).fill(1));
}

/** Create a matrix with entries drawn uniformly from [0, 1).
 * @param rows - Number of rows.
 * @param cols - Number of columns.
 * @param rng - Optional random number generator (default Math.random). */
export function random(
  rows: number,
  cols: number,
  rng: () => number = Math.random,
): Matrix {
  const data = new Float64Array(rows * cols);

  for (let i = 0; i < data.length; i++) {
    data[i] = rng();
  }

  return createMatrix(rows, cols, data);
}

/** Create a square diagonal matrix from an array of diagonal entries. */
export function fromDiagonal(diag: ArrayLike<number>): Matrix {
  const n = diag.length;
  const data = new Float64Array(n * n);

  for (let i = 0; i < n; i++) {
    data[i * n + i] = diag[i];
  }

  return createMatrix(n, n, data);
}
