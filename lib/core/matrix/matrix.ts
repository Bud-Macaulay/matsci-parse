/** A matrix backed by a column-major Float64Array. */
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

/** Compute the linear index for the given (row, col) in a column-major layout.
 * @param cols - Number of columns in the matrix.
 * @param row - Row index.
 * @param col - Column index.
 * @returns Linear index into the data array. */
export function index(cols: number, row: number, col: number): number {
  return row * cols + col;
}
