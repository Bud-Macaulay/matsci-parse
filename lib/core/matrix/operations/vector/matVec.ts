import { Matrix } from "../../matrix";
import { Vector } from "../../vector";

/** Multiply a matrix by a column vector (M·v).
 * @param m - Matrix.
 * @param v - Vector of length M.cols.
 * @returns A vector of length M.rows. */
export function matVec(m: Matrix, v: ArrayLike<number>): Vector {
  if (v.length !== m.cols) {
    throw new Error("Invalid matrix-vector multiplication dimensions");
  }

  const rows = m.rows;
  const cols = m.cols;
  const md = m.data;
  const out = new Float64Array(rows);

  for (let r = 0; r < rows; r++) {
    const offset = r * cols;

    let sum = 0;

    for (let c = 0; c < cols; c++) {
      sum += md[offset + c] * v[c];
    }

    out[r] = sum;
  }

  return out;
}
