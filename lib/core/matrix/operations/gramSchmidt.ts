import { Matrix, createMatrix } from "../matrix";

/** Squared norms at or below this are treated as a dependent (zero) row. */
const DEPENDENT_NORM2 = 1e-20;

export interface GramSchmidtResult {
  /** Mutually orthogonal (not normalized) rows b*ᵢ, same shape as the input. */
  orthogonal: Matrix;
  /** Lower-triangular coefficients μᵢⱼ = ⟨bᵢ, b*ⱼ⟩ / ⟨b*ⱼ, b*ⱼ⟩ (j < i), so
   * that B = μ·B* with a unit diagonal. */
  mu: Matrix;
}

/** Gram-Schmidt kernel over raw row-major buffers (modified Gram-Schmidt).
 * Orthogonalizes the `rows`×`cols` matrix `B` into `Q` and writes the
 * coefficients into the `rows`×`rows` buffer `mu` (unit diagonal, zero above).
 * Rows that are dependent on earlier ones come out as (near) zero, and later
 * rows get μ = 0 against them. Backs {@link gramSchmidt} and hot paths (e.g.
 * LLL) that reuse their buffers.
 * @param B - Input rows (read only).
 * @param rows - Number of rows.
 * @param cols - Number of columns.
 * @param Q - Output orthogonal rows, `Q.length >= rows*cols`.
 * @param mu - Output coefficients, `mu.length >= rows*rows`. */
export function gramSchmidtInto(
  B: Float64Array,
  rows: number,
  cols: number,
  Q: Float64Array,
  mu: Float64Array,
): void {
  mu.fill(0, 0, rows * rows);

  for (let i = 0; i < rows; i++) {
    const iOffset = i * cols;

    for (let k = 0; k < cols; k++) {
      Q[iOffset + k] = B[iOffset + k];
    }

    for (let j = 0; j < i; j++) {
      const jOffset = j * cols;

      let qjqj = 0;
      let qiqj = 0;

      for (let k = 0; k < cols; k++) {
        const qjk = Q[jOffset + k];
        qjqj += qjk * qjk;
        qiqj += Q[iOffset + k] * qjk;
      }

      if (qjqj <= DEPENDENT_NORM2) {
        continue;
      }

      const coeff = qiqj / qjqj;
      mu[i * rows + j] = coeff;

      for (let k = 0; k < cols; k++) {
        Q[iOffset + k] -= coeff * Q[jOffset + k];
      }
    }

    mu[i * rows + i] = 1;
  }
}

/** Gram-Schmidt orthogonalization of the rows of B (modified Gram-Schmidt).
 * @param B - An m×n matrix whose rows are the vectors.
 * @returns The orthogonal rows B* and coefficients μ with B = μ·B*. */
export function gramSchmidt(B: Matrix): GramSchmidtResult {
  const orthogonal = createMatrix(B.rows, B.cols);
  const mu = createMatrix(B.rows, B.rows);

  gramSchmidtInto(B.data, B.rows, B.cols, orthogonal.data, mu.data);

  return { orthogonal, mu };
}
