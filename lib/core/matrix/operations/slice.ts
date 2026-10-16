import { Matrix, createMatrix } from "../matrix";

/** Copy the block of rows [rowStart, rowEnd) and columns [colStart, colEnd)
 * out of a matrix. Bounds are half-open, like `Array.prototype.slice`.
 * @param m - Input matrix.
 * @param rowStart - First row (inclusive).
 * @param rowEnd - Last row (exclusive). Defaults to m.rows.
 * @param colStart - First column (inclusive). Defaults to 0.
 * @param colEnd - Last column (exclusive). Defaults to m.cols.
 * @returns A new Matrix containing the block. */
export function slice(
  m: Matrix,
  rowStart: number,
  rowEnd: number = m.rows,
  colStart: number = 0,
  colEnd: number = m.cols,
): Matrix {
  if (
    rowStart < 0 ||
    rowEnd > m.rows ||
    rowStart > rowEnd ||
    colStart < 0 ||
    colEnd > m.cols ||
    colStart > colEnd
  ) {
    throw new Error("Slice bounds out of range");
  }

  const rows = rowEnd - rowStart;
  const cols = colEnd - colStart;

  // Full-width row blocks are contiguous in row-major storage.
  if (cols === m.cols) {
    return {
      rows,
      cols,
      data: m.data.slice(rowStart * m.cols, rowEnd * m.cols),
    };
  }

  const out = createMatrix(rows, cols);
  const src = m.data;
  const od = out.data;

  for (let r = 0; r < rows; r++) {
    const srcOffset = (rowStart + r) * m.cols + colStart;
    const outOffset = r * cols;

    for (let c = 0; c < cols; c++) {
      od[outOffset + c] = src[srcOffset + c];
    }
  }

  return out;
}
