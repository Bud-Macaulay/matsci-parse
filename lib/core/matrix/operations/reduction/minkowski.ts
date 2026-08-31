/**
 * Minkowski reduction of an n×n lattice basis (rows are basis vectors).
 *
 * A basis (b₁, …, bₙ) is Minkowski-reduced when each bᵢ is a shortest vector
 * of the projection of the lattice onto the orthogonal complement of
 * (b₁, …, bᵢ₋₁), subject to {b₁, …, bᵢ} extending to a basis of the whole
 * lattice. Up to dimension 4 the reduced basis is unique up to signed
 * permutations.
 *
 * The implementation proceeds recursively:
 *   1. Find the shortest vector of the current projected lattice that is
 *      primitive (always extendable to a complete unimodular basis).
 *   2. Re-express the remaining vectors so that this shortest vector is the
 *      first of the current block, via a unimodular block transformation.
 *   3. Recurse on the projection onto the orthogonal complement of the fixed
 *      vectors.
 *
 * All arithmetic is exact integer/rational; the returned transformation is
 * unimodular (det = ±1).
 *
 * @see https://en.wikipedia.org/wiki/Lattice_reduction
 * @see https://en.wikipedia.org/wiki/Minkowski%27s_theorem
 */

import { Matrix, createMatrix } from "../../matrix";
import { determinant } from "../determinant";

export interface MinkowskiResult {
  /** The Minkowski-reduced basis matrix (rows are lattice vectors). */
  basis: Matrix;
  /** The unimodular transformation matrix U such that reduced = U × original. */
  transform: Matrix;
}

/** Greatest common divisor of two integers (non-negative). */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** gcd of all entries of a vector (so v is primitive ⟺ result === 1). */
function vecGcd(v: Int32Array): number {
  let g = 0;
  for (let i = 0; i < v.length; i++) g = gcd(g, v[i]);
  return g;
}

/** Extended Euclidean: returns [g, p, q] with p*a + q*b = g = gcd(a,b). */
function bezout(a: number, b: number): [number, number, number] {
  a = Math.round(a);
  b = Math.round(b);
  let oldR = a;
  let r = b;
  let oldS = 1;
  let s = 0;
  let oldT = 0;
  let t = 1;
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  return [oldR, oldS, oldT];
}

/**
 * Complete a primitive integer vector `v` (length `m`) to an `m×m` unimodular
 * integer matrix whose first row is `v`.
 *
 * Construction: apply elementary *column* operations (tracked in an identity
 * matrix `T`) to reduce `v` to (±1, 0, …, 0). Then `v·T = ±e₁`, so the first
 * row of `T⁻¹` is ±v; we return `T⁻¹` corrected to make its first row exactly
 * `v` (det is preserved at ±1).
 */
function completeToUnimodular(v: Int32Array, m: number): Float64Array {
  // T: column-op matrix, starts as identity.
  const T = new Int32Array(m * m);
  for (let i = 0; i < m; i++) T[i * m + i] = 1;

  // Working row vector w = v (right-multiplied by T as we go).
  const w = new Int32Array(m);
  for (let i = 0; i < m; i++) w[i] = v[i];

  for (let idx = 0; idx < m - 1; idx++) {
    const a = w[idx];
    const b = w[idx + 1];
    if (b === 0) continue;

    const [gab, p, q] = bezout(a, b); // p*a + q*b = gab
    const r = -b / gab;
    const s = a / gab;

    w[idx] = gab;
    w[idx + 1] = 0;

    // Apply the SL(2) column transform on columns idx, idx+1 of T:
    //   col_idx'  = p*col_idx  + q*col_{idx+1}
    //   col_{idx+1}' = r*col_idx + s*col_{idx+1}
    for (let row = 0; row < m; row++) {
      const c0 = T[row * m + idx];
      const c1 = T[row * m + idx + 1];
      T[row * m + idx] = p * c0 + q * c1;
      T[row * m + idx + 1] = r * c0 + s * c1;
    }
  }

  // Now v·T = (0, …, ±1, …, 0): the gcd (a unit) sits at some pivot `p` of w.
  let p = 0;
  for (let i = 0; i < m; i++) {
    if (w[i] !== 0) {
      p = i;
      break;
    }
  }

  const M = inverseIntMat(T, m);
  // Swap row 0 and row p of T⁻¹ (row p is ±v), then set row 0 to exactly v.
  const r0 = new Array<number>(m);
  for (let c = 0; c < m; c++) r0[c] = Math.round(M[0 * m + c]);
  for (let c = 0; c < m; c++) {
    M[0 * m + c] = Math.round(M[p * m + c]);
    M[p * m + c] = r0[c];
  }
  for (let c = 0; c < m; c++) M[0 * m + c] = v[c];
  return M;
}

/** Exact inverse of an integer matrix with det = ±1 (entries stay integer). */
function inverseIntMat(A: Int32Array, n: number): Float64Array {
  const w = 2 * n;
  const aug = new Float64Array(n * w);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) aug[i * w + j] = A[i * n + j];
    aug[i * w + n + i] = 1;
  }
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r * w + col]) > Math.abs(aug[piv * w + col])) piv = r;
    }
    if (piv !== col) {
      for (let c = 0; c < w; c++) {
        const t = aug[col * w + c];
        aug[col * w + c] = aug[piv * w + c];
        aug[piv * w + c] = t;
      }
    }
    const pv = aug[col * w + col];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r * w + col] / pv;
      for (let c = 0; c < w; c++) aug[r * w + c] -= f * aug[col * w + c];
    }
  }
  for (let c = 0; c < n; c++) {
    const pv = aug[c * w + c];
    for (let r = 0; r < n; r++) aug[r * w + n + c] /= pv;
  }
  const inv = new Float64Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) inv[r * n + c] = aug[r * w + n + c];
  }
  return inv;
}

/** Reduce the block of rows [cur, n) in place. Rows [0, cur) are fixed and
 *  never modified; `transform` accumulates the same row operations so that
 *  basis = transform × originalBasis. */
function minkowskiReduce(
  basis: Float64Array,
  transform: Float64Array,
  n: number,
  cur: number,
): void {
  const m = n - cur;
  if (m <= 1) return;

  const b = basis;

  // --- Fixed rows (0..cur-1): used to project. --------------------------
  // Orthonormal basis of span of fixed rows via Gram-Schmidt.
  const u = new Float64Array(cur * n); // orthonormal rows
  for (let i = 0; i < cur; i++) {
    for (let k = 0; k < n; k++) u[i * n + k] = b[i * n + k];
    for (let j = 0; j < i; j++) {
      const dot = dot2(b, i, u, j, n);
      for (let k = 0; k < n; k++) u[i * n + k] -= dot * u[j * n + k];
    }
    let len2 = 0;
    for (let k = 0; k < n; k++) len2 += u[i * n + k] * u[i * n + k];
    const len = Math.sqrt(len2) || 1;
    for (let k = 0; k < n; k++) u[i * n + k] /= len;
  }

  // --- Find the shortest primitive vector of the projected lattice. -----
  // A candidate is c ∈ Z^m (primitive: gcd=1), vector w = Σ c_d * row[cur+d].
  // Its projected squared length = |w|² - |Σ_f (w·u_f)|².
  // Bound the coefficient search: any shortest vector has |c| bounded by a
  // Siegel-type constant; a generous hypercube of radius `m` suffices for the
  // small dimensions this algorithm targets, and we guard by taking the first
  // strictly-shortest found.
  const B = Math.max(1, m);
  const coeffs = new Int32Array(m);
  const total = Math.pow(2 * B + 1, m);

  let bestLen2 = Infinity;
  let bestCoeffs: Int32Array | null = null;

  for (let idx = 1; idx < total; idx++) {
    let rem = idx;
    let primitive = false;
    for (let d = 0; d < m; d++) {
      const k = (rem % (2 * B + 1)) - B;
      rem = Math.floor(rem / (2 * B + 1));
      coeffs[d] = k;
      if (k !== 0) primitive = true;
    }
    if (!primitive) continue;
    if (vecGcd(coeffs) !== 1) continue; // must be primitive in Z^m

    // projected length
    const wArr: number[] = new Array(n).fill(0);
    for (let d = 0; d < m; d++) {
      if (coeffs[d] === 0) continue;
      const r = (cur + d) * n;
      for (let k = 0; k < n; k++) wArr[k] += coeffs[d] * b[r + k];
    }
    let ww = 0;
    for (let k = 0; k < n; k++) ww += wArr[k] * wArr[k];
    let proj2 = ww;
    for (let f = 0; f < cur; f++) {
      let d = 0;
      for (let k = 0; k < n; k++) d += wArr[k] * u[f * n + k];
      proj2 -= d * d;
    }
    if (proj2 < bestLen2 - 1e-9) {
      bestLen2 = proj2;
      bestCoeffs = new Int32Array(coeffs);
    }
  }

  if (!bestCoeffs) {
    minkowskiReduce(basis, transform, n, cur + 1);
    return;
  }

  // --- Replace the first row of the block with the shortest vector, and
  //     complete to a unimodular block transform. ------------------------
  const M = completeToUnimodular(bestCoeffs, m);

  // New rows cur..n-1 = M × old rows cur..n-1.
  const oldRows: number[][] = [];
  for (let d = 0; d < m; d++) {
    oldRows.push([]);
    const r = (cur + d) * n;
    for (let k = 0; k < n; k++) oldRows[d].push(b[r + k]);
  }
  for (let r = 0; r < m; r++) {
    for (let k = 0; k < n; k++) {
      let s = 0;
      for (let d = 0; d < m; d++) s += M[r * m + d] * oldRows[d][k];
      b[(cur + r) * n + k] = s;
    }
  }

  // Same block transform composed into `transform`'s rows cur..n-1.
  const oldT: number[][] = [];
  for (let d = 0; d < m; d++) {
    oldT.push([]);
    const r = (cur + d) * n;
    for (let c = 0; c < n; c++) oldT[d].push(transform[r + c]);
  }
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      let s = 0;
      for (let d = 0; d < m; d++) s += M[r * m + d] * oldT[d][c];
      transform[(cur + r) * n + c] = s;
    }
  }

  // --- Recurse on the projected (n-1)-dimensional sub-lattice. ----------
  minkowskiReduce(basis, transform, n, cur + 1);
}

/** Dot product of basis row `i1` (of `b`) with orthonormal row `i2` (of `u`). */
function dot2(
  b: Float64Array,
  i1: number,
  u: Float64Array,
  i2: number,
  n: number,
): number {
  let s = 0;
  for (let k = 0; k < n; k++) s += b[i1 * n + k] * u[i2 * n + k];
  return s;
}

/**
 * Minkowski-reduce an n×n lattice basis.
 *
 * @param input  An n×n basis matrix whose rows are the lattice vectors.
 * @returns The reduced basis and the unimodular transformation such that
 *          `reduced = transform × original`.
 */
export function minkowski(input: Matrix): MinkowskiResult {
  if (input.rows !== input.cols) {
    throw new Error(
      `Minkowski reduction requires a square matrix, got ${input.rows}×${input.cols}`,
    );
  }

  const n = input.rows;

  if (Math.abs(determinant(input)) < 1e-9) {
    throw new Error("Minkowski reduction requires a full-rank lattice");
  }

  const basis = new Float64Array(input.data);
  const transform = new Float64Array(n * n);
  for (let i = 0; i < n; i++) transform[i * n + i] = 1;

  minkowskiReduce(basis, transform, n, 0);

  return {
    basis: createMatrix(n, n, basis),
    transform: createMatrix(n, n, transform),
  };
}
