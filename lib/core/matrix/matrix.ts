export interface Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: Float64Array;
}

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

export function clone(matrix: Matrix): Matrix {
  return {
    rows: matrix.rows,
    cols: matrix.cols,
    data: new Float64Array(matrix.data),
  };
}

export function index(cols: number, row: number, col: number): number {
  return row * cols + col;
}
