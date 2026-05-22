import { Matrix } from "../matrix";

/**
 * Extracts a column from a matrix as a vector.
 *
 * Returns a new Float64Array containing all elements from the specified column.
 *
 * @param m - The matrix
 * @param c - The column index (0-based)
 * @returns A new vector containing the column
 *
 * @example
 * ```typescript
 * const m = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const col1 = col(m, 1);  // [2, 5, 8]
 * ```
 */
export function col(m: Matrix, c: number): Float64Array {
  const out = new Float64Array(m.rows);

  for (let r = 0; r < m.rows; r++) {
    out[r] = m.data[r * m.cols + c];
  }

  return out;
}


/**
 * Sets a column in a matrix to the provided vector values.
 *
 * @param m - The matrix to modify
 * @param c - The column index (0-based)
 * @param v - The vector containing values to set
 * @returns The modified matrix (for chaining)
 *
 * @remarks
 * This function modifies the matrix in place. The vector length must match
 * the number of rows in the matrix.
 *
 * @example
 * ```typescript
 * const m = createMatrix(3, 2);
 * setCol(m, 0, [1, 2, 3]);
 * ```
 */
export function setCol(m: Matrix, c: number, v: ArrayLike<number>) {
  for (let r = 0; r < m.rows; r++) {
    m.data[r * m.cols + c] = v[r];
  }

  return m;
}
