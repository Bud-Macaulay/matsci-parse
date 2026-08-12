import { Matrix, createMatrix } from "../matrix";

/** Multiply two matrices (matrix product).
 * @param a - Left matrix.
 * @param b - Right matrix.
 * @returns A new Matrix containing the product. */
export function mul(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) {
    throw new Error("Invalid matrix multiplication dimensions");
  }

  const out = createMatrix(a.rows, b.cols);

  const aRows = a.rows;
  const aCols = a.cols;
  const bCols = b.cols;

  const ad = a.data;
  const bd = b.data;
  const od = out.data;

  // Iterate row → k → col so B and the output are accessed sequentially
  // in their row-major layout, improving cache locality.
  for (let row = 0; row < aRows; row++) {
    const aOffset = row * aCols;
    const outOffset = row * bCols;

    for (let k = 0; k < aCols; k++) {
      const aik = ad[aOffset + k];
      const bOffset = k * bCols;

      for (let col = 0; col < bCols; col++) {
        od[outOffset + col] += aik * bd[bOffset + col];
      }
    }
  }

  return out;
}
