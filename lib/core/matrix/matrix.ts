/**
 * A 2D matrix with row-major storage layout.
 *
 * Data is stored in a single `Float64Array` buffer in row-major order,
 * meaning elements are accessed as `data[row * cols + col]`.
 *
 * @remarks
 * - All matrices are immutable; operations return new matrices
 * - Use the `index()` helper function to calculate element positions
 * - Dimensions are read-only properties
 *
 * @example
 * ```typescript
 * const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);
 * console.log(m.rows);  // 2
 * console.log(m.cols);  // 3
 * ```
 */
export interface Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: Float64Array;
}

/**
 * Creates a new matrix with specified dimensions.
 *
 * If data is provided, it is converted to a Float64Array and validated to ensure
 * the correct number of elements. If no data is provided, the matrix is initialized
 * with zeros.
 *
 * @param rows - Number of rows in the matrix
 * @param cols - Number of columns in the matrix
 * @param data - Optional iterable of numbers to populate the matrix (row-major order)
 * @returns A new Matrix object
 * @throws Error if the provided data length does not match rows * cols
 *
 * @example
 * ```typescript
 * const m1 = createMatrix(2, 3);  // 2x3 matrix of zeros
 * const m2 = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);  // 2x3 matrix with data
 * ```
 */
export function createMatrix(
  rows: number,
  cols: number,
  data?: Iterable<number>,
): Matrix {
  const size = rows * cols;

  const buffer = data ? Float64Array.from(data) : new Float64Array(size);

  if (buffer.length !== size) {
    throw new Error(`Expected ${size} values, got ${buffer.length}`);
  }

  return {
    rows,
    cols,
    data: buffer,
  };
}

/**
 * Creates an identity matrix of the specified size.
 *
 * An identity matrix is a square matrix with ones on the main diagonal
 * and zeros elsewhere.
 *
 * @param size - The size of the identity matrix (size × size)
 * @returns An identity Matrix
 *
 * @example
 * ```typescript
 * const id = identity(3);
 * // Represents:
 * // [ 1  0  0 ]
 * // [ 0  1  0 ]
 * // [ 0  0  1 ]
 * ```
 */
export function identity(size: number): Matrix {
  const data = new Float64Array(size * size);

  for (let i = 0; i < size; i++) {
    data[i * size + i] = 1;
  }

  return {
    rows: size,
    cols: size,
    data,
  };
}

/**
 * Creates a deep copy of a matrix.
 *
 * The returned matrix is independent of the original; modifications to one
 * do not affect the other.
 *
 * @param matrix - The matrix to clone
 * @returns A new Matrix with the same values as the input
 *
 * @example
 * ```typescript
 * const m1 = createMatrix(2, 2, [1, 2, 3, 4]);
 * const m2 = clone(m1);
 * // m1 and m2 have the same values but are different objects
 * ```
 */
export function clone(matrix: Matrix): Matrix {
  return {
    rows: matrix.rows,
    cols: matrix.cols,
    data: new Float64Array(matrix.data),
  };
}

/**
 * Calculates the linear index in a row-major matrix's data array.
 *
 * Given a matrix's column count and a row/column position, returns the
 * corresponding index in the flattened data array.
 *
 * @param cols - The number of columns in the matrix
 * @param row - The row index (0-based)
 * @param col - The column index (0-based)
 * @returns The linear index in the flattened data array
 *
 * @example
 * ```typescript
 * // For a matrix with 3 columns, element at row 1, col 2 is at index:
 * const idx = index(3, 1, 2);  // returns 5 (1 * 3 + 2)
 * ```
 */
export function index(cols: number, row: number, col: number): number {
  return row * cols + col;
}
