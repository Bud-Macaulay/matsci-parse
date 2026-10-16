/** A matrix backed by a row-major Float64Array. */
export interface Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: Float64Array;
}

/** Create a new Matrix with the given dimensions, optionally populated from an iterable.
 * @param rows - Number of rows.
 * @param cols - Number of columns.
 * @param data - Optional iterable of values to fill the matrix.
 * @returns A new Matrix. */
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

/** Create a Matrix from an array of rows.
 * @param rows - Row arrays, all of the same length.
 * @param cols - Column count; defaults to the first row's length. Pass it
 *   when `rows` may be empty (e.g. a list of 0 positions with 3 columns).
 * @returns A new Matrix. */
export function fromRows(
  rows: readonly ArrayLike<number>[],
  cols: number = rows[0]?.length ?? 0,
): Matrix {
  const out = createMatrix(rows.length, cols);
  const od = out.data;

  for (let r = 0; r < rows.length; r++) {
    const src = rows[r];

    if (src.length !== cols) {
      throw new Error(`Expected row of length ${cols}, got ${src.length}`);
    }

    const offset = r * cols;

    for (let c = 0; c < cols; c++) {
      od[offset + c] = src[c];
    }
  }

  return out;
}

/** Convert a Matrix to an array of row arrays.
 * @param m - Input matrix.
 * @returns One plain number array per row. */
export function toRows(m: Matrix): number[][] {
  const out: number[][] = [];

  for (let r = 0; r < m.rows; r++) {
    const offset = r * m.cols;
    out.push(Array.from(m.data.subarray(offset, offset + m.cols)));
  }

  return out;
}

/** Return an identity matrix of the given size.
 * @param size - Number of rows and columns.
 * @returns A square identity matrix. */
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

/** Return a deep copy of the given matrix.
 * @param matrix - Matrix to clone.
 * @returns A new Matrix with copied data. */
export function clone(matrix: Matrix): Matrix {
  return {
    rows: matrix.rows,
    cols: matrix.cols,
    data: new Float64Array(matrix.data),
  };
}

/** Compute the linear index for the given (row, col) in a row-major layout.
 *
 * Useful for general matrix element access.
 * Performance-critical inner loops should generally use direct offset arithmetic.
 *
 * @param cols - Number of columns in the matrix.
 * @param row - Row index.
 * @param col - Column index.
 * @returns Linear index into the data array.
 */
export function index(cols: number, row: number, col: number): number {
  return row * cols + col;
}
