import { Matrix } from "../matrix";

/**
 * Extracts a row from a matrix as a vector.
 *
 * Returns a new Float64Array containing all elements from the specified row.
 * The row is copied, not referenced, so modifications do not affect the matrix.
 *
 * @param m - The matrix
 * @param r - The row index (0-based)
 * @returns A new vector containing the row
 *
 * @example
 * ```typescript
 * const m = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const row1 = row(m, 1);  // [4, 5, 6]
 * ```
 */
export function row(m: Matrix, r: number): Float64Array {
  const start = r * m.cols;
  return m.data.slice(start, start + m.cols);
}
