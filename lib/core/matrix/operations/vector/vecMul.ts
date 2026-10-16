import { Matrix } from "../../matrix";
import { Vector } from "../../vector";

/** Multiply a row vector by a matrix (vᵀ·M), e.g. fractional → Cartesian
 * coordinates with a row-vector lattice basis.
 * @param v - Vector of length M.rows.
 * @param m - Matrix.
 * @returns A vector of length M.cols. */
export function vecMul(v: ArrayLike<number>, m: Matrix): Vector {
  if (v.length !== m.rows) {
    throw new Error("Invalid vector-matrix multiplication dimensions");
  }

  const rows = m.rows;
  const cols = m.cols;
  const md = m.data;
  const out = new Float64Array(cols);

  for (let k = 0; k < rows; k++) {
    const vk = v[k];
    const offset = k * cols;

    for (let c = 0; c < cols; c++) {
      out[c] += vk * md[offset + c];
    }
  }

  return out;
}
