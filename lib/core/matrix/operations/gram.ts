import { Matrix, createMatrix } from "../matrix";

/** Compute the Gram matrix G = B·Bᵀ of the rows of B.
 * Only the upper triangle is computed; the lower triangle is mirrored.
 * @param B - An m×n matrix whose rows are the vectors.
 * @returns The symmetric m×m Gram matrix. */
export function gram(B: Matrix): Matrix {
  const m = B.rows;
  const n = B.cols;

  const out = createMatrix(m, m);

  const bd = B.data;
  const od = out.data;

  for (let i = 0; i < m; i++) {
    const iOffset = i * n;

    for (let j = i; j < m; j++) {
      const jOffset = j * n;

      let value = 0;

      for (let k = 0; k < n; k++) {
        value += bd[iOffset + k] * bd[jOffset + k];
      }

      od[i * m + j] = value;
      od[j * m + i] = value;
    }
  }

  return out;
}
