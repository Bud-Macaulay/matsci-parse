/**
 * Seysen reduction of an n×n lattice basis (rows are basis vectors).
 *
 * Seysen reduction minimizes the Seysen measure
 *
 *     S(B) = Σᵢ |bᵢ*|² · |bᵢ|²  =  Σᵢ G(i,i) · H(i,i)
 *
 * where G = B·Bᵀ is the Gram matrix and H = G⁻¹ = B*·B*ᵀ is the Gram matrix of
 * the dual basis. Minimizing S makes the basis *and* its dual simultaneously
 * short, which is desirable when both forward and inverse lattice transforms
 * are needed (e.g. for reticular-chemistry and Z-matrices in space-group
 * handling).
 *
 * The algorithm iteratively applies the best unimodular elementary move to each
 * unordered index pair until no move decreases S. Two moves are considered per
 * pair:
 *   - a primal row move b_j ← b_j + t·b_i, and
 *   - the transpose-symmetric move on the dual (a primal column operation).
 * In each case the optimal integer parameter is the rounded minimizer of the
 * local 2×2 Seysen objective.
 *
 * @see M. Seysen, "A note on lattice reduction", 1993.
 * @see https://en.wikipedia.org/wiki/Lattice_reduction#Seysen_reduction
 */

import { Matrix, createMatrix } from "../../matrix";
import { determinant } from "../determinant";

export interface SeysenResult {
  /** The reduced basis matrix (rows are lattice vectors). */
  basis: Matrix;
  /** The unimodular transformation matrix U such that reduced = U × original. */
  transform: Matrix;
  /** The final Seysen measure S(B) = Σᵢ G(i,i)·H(i,i). */
  measure: number;
}

/** Inverse of a square matrix via Gauss–Jordan elimination (Float64). */
function invert(m: Float64Array, n: number): Float64Array {
  const w = 2 * n;
  const aug = new Float64Array(n * w);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) aug[i * w + j] = m[i * n + j];
    aug[i * w + n + i] = 1;
  }
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r * w + col]) > Math.abs(aug[piv * w + col])) piv = r;
    }
    if (Math.abs(aug[piv * w + col]) < 1e-300) {
      throw new Error("Seysen reduction requires a full-rank lattice");
    }
    if (piv !== col) {
      for (let c = 0; c < w; c++) {
        const t = aug[col * w + c];
        aug[col * w + c] = aug[piv * w + c];
        aug[piv * w + c] = t;
      }
    }
    const pv = aug[col * w + col];
    for (let c = 0; c < w; c++) aug[col * w + c] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r * w + col];
      for (let c = 0; c < w; c++) aug[r * w + c] -= f * aug[col * w + c];
    }
  }
  const inv = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) inv[i * n + j] = aug[i * w + n + j];
  }
  return inv;
}

/** Dense Gram product G = B·Bᵀ. */
function gram(B: Float64Array, n: number): Float64Array {
  const G = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += B[i * n + k] * B[j * n + k];
      G[i * n + j] = s;
      G[j * n + i] = s;
    }
  }
  return G;
}

/** Current Seysen measure S = Σᵢ G(i,i)·H(i,i). */
function measure(G: Float64Array, H: Float64Array, n: number): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += G[i * n + i] * H[i * n + i];
  return s;
}

/**
 * Seysen-reduce an n×n lattice basis.
 *
 * @param input  An n×n basis matrix whose rows are the lattice vectors.
 * @returns The reduced basis, the unimodular transformation, and the final
 *          Seysen measure.
 */
export function seysen(input: Matrix): SeysenResult {
  if (input.rows !== input.cols) {
    throw new Error(
      `Seysen reduction requires a square matrix, got ${input.rows}×${input.cols}`,
    );
  }
  const n = input.rows;
  if (Math.abs(determinant(input)) < 1e-9) {
    throw new Error("Seysen reduction requires a full-rank lattice");
  }

  const B = new Float64Array(input.data);
  const B0 = new Float64Array(input.data);
  const B0inv = invert(B0, n);
  const U = new Float64Array(n * n);
  for (let i = 0; i < n; i++) U[i * n + i] = 1;

  let G = gram(B, n);
  let H = invert(G, n);

  // Recompute the left-multiply transform U such that B = U·B0.
  const syncTransform = () => {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += B[i * n + k] * B0inv[k * n + j];
        U[i * n + j] = Math.round(s);
      }
    }
  };

  let improved = true;
  let guard = 0;
  const maxIter = 1000;
  while (improved && guard++ < maxIter) {
    improved = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const g00 = G[a * n + a];
        const g11 = G[b * n + b];
        const g01 = G[a * n + b];
        const h00 = H[a * n + a];
        const h11 = H[b * n + b];
        const h01 = H[a * n + b];
        const s0 = g00 * h00 + g11 * h11;

        // --- Primal row move: b_b += t·b_a -------------------------------
        const tStar = (g00 * h01 - g01 * h11) / (2 * g00 * h11);
        const t = Math.round(tStar);
        if (t !== 0) {
          const sNew =
            s0 + 2 * t * (g01 * h11 - g00 * h01) + 2 * t * t * g00 * h11;
          if (sNew < s0 - 1e-12) {
            for (let k = 0; k < n; k++) B[b * n + k] += t * B[a * n + k];
            G = gram(B, n);
            H = invert(G, n);
            syncTransform();
            improved = true;
            continue;
          }
        }

        // --- Dual move (row op on the dual basis ⇔ primal row_i -= s·row_j) --
        const sStar = (g01 * h00 - g11 * h01) / (2 * g11 * h00);
        const s = Math.round(sStar);
        if (s !== 0) {
          const sNew =
            s0 + 2 * s * (g11 * h01 - g01 * h00) + 2 * s * s * g11 * h00;
          if (sNew < s0 - 1e-12) {
            for (let k = 0; k < n; k++) B[a * n + k] -= s * B[b * n + k];
            G = gram(B, n);
            H = invert(G, n);
            syncTransform();
            improved = true;
            // continue scanning; pair (a,b) might improve again
          }
        }
      }
    }
  }

  return {
    basis: createMatrix(n, n, B),
    transform: createMatrix(n, n, U),
    measure: measure(G, H, n),
  };
}
