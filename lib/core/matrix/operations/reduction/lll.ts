/**
 * Lenstra–Lenstra–Lovász (LLL) lattice basis reduction.
 *
 * Reduces an integer (or rational) basis to a reduced basis where
 * vectors are shorter and more orthogonal.
 *
 * @see https://en.wikipedia.org/wiki/Lenstra%E2%80%93Lenstra%E2%80%93Lov%C3%A1sz_lattice_basis_reduction_algorithm
 */

import { Matrix, createMatrix } from "../../matrix";
import { dot } from "../vector/dot";

export interface LllResult {
  /** The reduced basis matrix (same shape as input). */
  basis: Matrix;
  /** The unimodular transformation matrix U such that reduced = U × original. */
  transform: Matrix;
}

/** Extract row `i` from a flat row-major array as a Vector slice. */
function row(data: Float64Array, cols: number, i: number): Float64Array {
  return data.subarray(i * cols, i * cols + cols);
}

/**
 * Perform LLL lattice basis reduction.
 *
 * @param input  An n×n basis matrix (row vectors). Typically integer-valued.
 * @param delta  Lovász parameter, must be in (0.25, 1). Default 0.75.
 * @returns The reduced basis and the transformation matrix.
 */
export function lll(input: Matrix, delta = 0.75): LllResult {
  const n = input.rows;

  if (input.rows !== input.cols) {
    throw new Error(
      `LLL requires a square matrix, got ${input.rows}×${input.cols}`,
    );
  }

  if (delta <= 0.25 || delta >= 1) {
    throw new Error(`delta must be in (0.25, 1), got ${delta}`);
  }

  // work on mutable copies
  const b = new Float64Array(input.data);
  const u = new Float64Array(n * n);
  for (let i = 0; i < n; i++) u[i * n + i] = 1;

  // Gram-Schmidt orthogonalization
  const gs = new Float64Array(n * n); // orthogonal vectors
  const mu = new Float64Array(n * n); // μ[i][j]

  function orthogonalize() {
    mu.fill(0);

    for (let i = 0; i < n; i++) {
      // copy b[i] into gs[i]
      for (let k = 0; k < n; k++) gs[i * n + k] = b[i * n + k];

      for (let j = 0; j < i; j++) {
        const gj = row(gs, n, j);
        const dotGjGj = dot(gj, gj);
        if (dotGjGj > 1e-20) {
          mu[i * n + j] = dot(row(b, n, i), gj) / dotGjGj;
        } else {
          mu[i * n + j] = 0;
        }

        // gs[i] -= μ[i][j] * gs[j]
        const m = mu[i * n + j];
        for (let k = 0; k < n; k++) {
          gs[i * n + k] -= m * gs[j * n + k];
        }
      }
    }
  }

  function gsDot(i: number, j: number): number {
    return dot(row(gs, n, i), row(gs, n, j));
  }

  function sizeReduce(k: number) {
    for (let j = k - 1; j >= 0; j--) {
      const mjk = Math.round(mu[k * n + j]);
      if (mjk !== 0) {
        // b[k] -= mjk * b[j]
        for (let c = 0; c < n; c++) {
          b[k * n + c] -= mjk * b[j * n + c];
        }
        // u[k] -= mjk * u[j]
        for (let c = 0; c < n; c++) {
          u[k * n + c] -= mjk * u[j * n + c];
        }
        // update μ: b[k] -= r·b[j] gives μ[k][j] -= r (since μ[j][j] ≡ 1)
        // and μ[k][l] -= r·μ[j][l] for l < j.
        for (let i = 0; i < j; i++) {
          mu[k * n + i] -= mjk * mu[j * n + i];
        }
        mu[k * n + j] -= mjk;
      }
    }
  }

  function swapRows(i: number) {
    // swap b[i] and b[i+1]
    for (let c = 0; c < n; c++) {
      const tmp = b[i * n + c];
      b[i * n + c] = b[(i + 1) * n + c];
      b[(i + 1) * n + c] = tmp;
    }
    // swap u[i] and u[i+1]
    for (let c = 0; c < n; c++) {
      const tmp = u[i * n + c];
      u[i * n + c] = u[(i + 1) * n + c];
      u[(i + 1) * n + c] = tmp;
    }

  }

  // Main loop
  orthogonalize();

  let k = 1;
  while (k < n) {
    sizeReduce(k);

    const Dk = gsDot(k, k);
    const Dk1 = gsDot(k - 1, k - 1);
    const mkk = mu[k * n + (k - 1)];

    // Lovász condition: |gs[k]|² ≥ (δ - μ[k][k-1]²) |gs[k-1]|²
    if (Dk >= (delta - mkk * mkk) * Dk1) {
      k++;
    } else {
      swapRows(k - 1);
      if (k > 1) k--;
      orthogonalize();
    }
  }

  return {
    basis: createMatrix(n, n, b),
    transform: createMatrix(n, n, u),
  };
}
