import { Matrix, createMatrix } from "../matrix";
import { Vector } from "../vector";

/** Compute the outer product u ⊗ v = u vᵀ of two vectors.
 * @param u - Left vector (column).
 * @param v - Right vector (row).
 * @returns An m×n matrix where result[i][j] = u[i] * v[j]. */
export function outerProduct(u: Vector, v: Vector): Matrix {
  const m = u.length;
  const n = v.length;
  const out = createMatrix(m, n);

  for (let i = 0; i < m; i++) {
    const row = i * n;
    const u_i = u[i];

    for (let j = 0; j < n; j++) {
      out.data[row + j] = u_i * v[j];
    }
  }

  return out;
}
