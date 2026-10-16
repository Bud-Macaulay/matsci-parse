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
import { gram } from "../gram";
import { inverseSmall } from "../inverse/inverseSmall";
import { mul } from "../mul";

export interface SeysenResult {
  /** The reduced basis matrix (rows are lattice vectors). */
  basis: Matrix;
  /** The unimodular transformation matrix U such that reduced = U × original. */
  transform: Matrix;
  /** The final Seysen measure S(B) = Σᵢ G(i,i)·H(i,i). */
  measure: number;
}

/** Gram matrix G = B·Bᵀ and its inverse H = G⁻¹ (Gram of the dual basis). */
function gramPair(B: Matrix): { G: Float64Array; H: Float64Array } {
  const G = gram(B);
  return { G: G.data, H: inverseSmall(G).data };
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

  const Bm = createMatrix(n, n, input.data);
  const B = Bm.data;
  const B0inv = inverseSmall(input);

  let { G, H } = gramPair(Bm);

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
            ({ G, H } = gramPair(Bm));
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
            ({ G, H } = gramPair(Bm));
            improved = true;
            // continue scanning; pair (a,b) might improve again
          }
        }
      }
    }
  }

  // Left-multiply transform U such that B = U·B0 (integral up to fp error).
  const U = mul(Bm, B0inv);
  for (let i = 0; i < U.data.length; i++) U.data[i] = Math.round(U.data[i]);

  return {
    basis: Bm,
    transform: U,
    measure: measure(G, H, n),
  };
}
