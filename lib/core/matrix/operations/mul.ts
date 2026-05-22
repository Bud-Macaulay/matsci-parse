import { Matrix, createMatrix, index } from "../matrix";

/**
 * Multiplies two matrices.
 *
 * Performs standard matrix multiplication: C = A × B. The number of columns in A
 * must equal the number of rows in B. The result has dimensions (A.rows × B.cols).
 *
 * @param a - The first matrix (left operand)
 * @param b - The second matrix (right operand)
 * @returns A new matrix containing the product
 * @throws Error if matrix dimensions are incompatible for multiplication
 *
 * @remarks
 * Matrix multiplication is not commutative; A × B ≠ B × A in general.
 *
 * @example
 * ```typescript
 * const a = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);
 * const b = createMatrix(3, 2, [7, 8, 9, 10, 11, 12]);
 * const result = mul(a, b);  // 2x2 matrix
 * ```
 */
export function mul(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) {
    throw new Error("Invalid matrix multiplication dimensions");
  }

  const out = createMatrix(a.rows, b.cols);

  const aRows = a.rows;
  const aCols = a.cols;
  const bCols = b.cols;

  for (let row = 0; row < aRows; row++) {
    for (let col = 0; col < bCols; col++) {
      let sum = 0;

      for (let k = 0; k < aCols; k++) {
        sum += a.data[index(a.cols, row, k)] * b.data[index(b.cols, k, col)];
      }

      out.data[index(out.cols, row, col)] = sum;
    }
  }

  return out;
}
