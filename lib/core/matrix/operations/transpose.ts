import { Matrix, createMatrix, index } from "../matrix";

/**
 * Transposes a matrix by swapping rows and columns.
 *
 * Returns a new matrix where element (i, j) becomes element (j, i).
 * A matrix of size (m × n) becomes (n × m).
 *
 * @param matrix - The matrix to transpose
 * @returns A new transposed matrix
 *
 * @example
 * ```typescript
 * const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);
 * // Represents: [[1, 2, 3], [4, 5, 6]]
 * const t = transpose(m);
 * // Represents: [[1, 4], [2, 5], [3, 6]]
 * ```
 */
export function transpose(matrix: Matrix): Matrix {
  const out = createMatrix(matrix.cols, matrix.rows);

  for (let row = 0; row < matrix.rows; row++) {
    for (let col = 0; col < matrix.cols; col++) {
      out.data[index(out.cols, col, row)] =
        matrix.data[index(matrix.cols, row, col)];
    }
  }

  return out;
}
