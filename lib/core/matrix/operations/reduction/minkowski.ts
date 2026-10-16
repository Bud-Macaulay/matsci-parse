/**
 * Minkowski reduction of an n×n lattice basis (rows are basis vectors).
 *
 * The implementation is optimized for small dimensions (particularly n <= 4).
 *
 * The reduction proceeds recursively:
 *
 *   1. Project the current block onto the orthogonal complement of the
 *      already-fixed vectors.
 *   2. Find a shortest primitive vector of that projected lattice using
 *      bounded sphere enumeration.
 *   3. Complete its coefficient vector to a unimodular transformation.
 *   4. Apply the transformation.
 *   5. Size-reduce the remaining vectors against the newly fixed vector.
 *   6. Continue with the next projected lattice.
 *
 * Geometric computations use Float64 arithmetic. Transformation entries are
 * integer-valued and are stored in Float64Array to match the Matrix API.
 *
 * @see https://en.wikipedia.org/wiki/Lattice_reduction
 * @see https://en.wikipedia.org/wiki/Minkowski%27s_theorem
 */

import { Matrix, createMatrix } from "../../matrix";
import { gcd } from "../../../math/numeric";
import { choleskyInto } from "../cholesky";
import { determinant } from "../determinant";
import { gram } from "../gram";
import { gramSchmidt } from "../gramSchmidt";
import { inverseSmall } from "../inverse/inverseSmall";
import { mul } from "../mul";
import { slice } from "../slice";
import { sub } from "../sub";
import { transpose } from "../transpose";
import { normalize } from "../vector/normalize";

export interface MinkowskiResult {
  /** The Minkowski-reduced basis matrix (rows are lattice vectors). */
  basis: Matrix;

  /** Unimodular U such that reduced = U × original. */
  transform: Matrix;
}

/* -------------------------------------------------------------------------- */
/* Integer helpers                                                            */
/* -------------------------------------------------------------------------- */

function vecGcd(v: Int32Array): number {
  let g = 0;

  for (let i = 0; i < v.length; i++) {
    g = gcd(g, v[i]);

    if (g === 1) return 1;
  }

  return g;
}

/**
 * Extended Euclidean algorithm.
 *
 * Returns [g, x, y] such that x*a + y*b = g >= 0.
 */
function bezout(a: number, b: number): [number, number, number] {
  let oldR = Math.trunc(a);
  let r = Math.trunc(b);

  let oldS = 1;
  let s = 0;

  let oldT = 0;
  let t = 1;

  while (r !== 0) {
    const q = Math.trunc(oldR / r);

    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }

  if (oldR < 0) {
    return [-oldR, -oldS, -oldT];
  }

  return [oldR, oldS, oldT];
}

/* -------------------------------------------------------------------------- */
/* Unimodular completion                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Complete a primitive vector v to an m×m unimodular matrix whose first row
 * is exactly v.
 *
 * We construct a unimodular row-operation matrix E such that
 *
 *     E × v = e₁
 *
 * and return E⁻¹. Since E consists only of elementary unimodular operations,
 * E⁻¹ is also unimodular.
 *
 * This avoids generic matrix inversion entirely.
 */
function completeToUnimodular(v: Int32Array, m: number): Float64Array {
  const T = new Float64Array(m * m);

  for (let i = 0; i < m; i++) {
    T[i * m + i] = 1;
  }

  const w = new Int32Array(v);

  for (let i = 0; i < m - 1; i++) {
    const a = w[i];
    const b = w[i + 1];

    if (b === 0) continue;

    if (a === 0) {
      /*
       * [ 0  1 ]
       * [-1  0 ]
       */
      w[i] = b;
      w[i + 1] = 0;

      for (let row = 0; row < m; row++) {
        const base = row * m;

        const x = T[base + i];
        const y = T[base + i + 1];

        T[base + i] = y;
        T[base + i + 1] = -x;
      }

      continue;
    }

    const [g, p, q] = bezout(a, b);

    const r = -b / g;
    const s = a / g;

    w[i] = g;
    w[i + 1] = 0;

    for (let row = 0; row < m; row++) {
      const base = row * m;

      const x = T[base + i];
      const y = T[base + i + 1];

      T[base + i] = p * x + q * y;
      T[base + i + 1] = r * x + s * y;
    }
  }

  /*
   * v × T = (1, 0, ..., 0).
   *
   * Therefore the first row of T⁻¹ is exactly v.
   *
   * T is unimodular (det ±1), so the inverse is integral up to fp error:
   * round it back to integers.
   *
   * Do not modify that row afterward: doing so can destroy unimodularity.
   */
  const out = inverseSmall(createMatrix(m, m, T)).data;

  for (let i = 0; i < out.length; i++) {
    out[i] = Math.round(out[i]);
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Projection / Gram matrix                                                   */
/* -------------------------------------------------------------------------- */

/** Orthonormal basis of the span of the first `count` (fixed) rows. */
function buildOrthonormalBasis(basis: Matrix, count: number): Matrix {
  const n = basis.cols;
  const U = gramSchmidt(slice(basis, 0, count)).orthogonal;

  for (let i = 0; i < count; i++) {
    const rowView = U.data.subarray(i * n, (i + 1) * n);
    rowView.set(normalize(rowView));
  }

  return U;
}

/**
 * Gram matrix of the open rows (cur..n-1) projected orthogonally to the span
 * of the fixed rows (0..cur-1):
 *
 *     G = Bₜ·Bₜᵀ − F·Fᵀ,   F = Bₜ·Uᵀ
 *
 * where Bₜ are the open rows and U is an orthonormal basis of the fixed span.
 */
function buildProjectedGram(basis: Matrix, cur: number): Float64Array {
  const open = slice(basis, cur);
  const G = gram(open);

  if (cur === 0) {
    return G.data;
  }

  const F = mul(open, transpose(buildOrthonormalBasis(basis, cur)));

  return sub(G, gram(F)).data;
}

/* -------------------------------------------------------------------------- */
/* Cholesky / SVP                                                             */
/* -------------------------------------------------------------------------- */

function shortestPrimitive(G: Float64Array, m: number): Int32Array {
  const best = new Int32Array(m);
  const current = new Int32Array(m);

  let bestLen2 = Infinity;

  /*
   * Coordinate vectors provide an immediate upper bound.
   */
  for (let i = 0; i < m; i++) {
    const len2 = G[i * m + i];

    if (len2 < bestLen2) {
      bestLen2 = len2;
      best.fill(0);
      best[i] = 1;
    }
  }

  const L = new Float64Array(m * m);

  if (!choleskyInto(G, m, L)) {
    return best;
  }

  function enumerate(k: number, partial: number): void {
    if (k < 0) {
      if (partial >= bestLen2) return;

      if (vecGcd(current) !== 1) return;

      bestLen2 = partial;
      best.set(current);

      return;
    }

    const diagonal = L[k * m + k];

    if (diagonal === 0) return;

    let centerNumerator = 0;

    for (let j = k + 1; j < m; j++) {
      centerNumerator += L[j * m + k] * current[j];
    }

    const remaining = bestLen2 - partial;

    if (remaining <= 0) return;

    const radius = Math.sqrt(remaining);

    const center = -centerNumerator / diagonal;

    const delta = radius / Math.abs(diagonal);

    const lo = Math.ceil(center - delta);
    const hi = Math.floor(center + delta);

    if (lo > hi) return;

    const nearest = Math.round(center);

    for (let offset = 0; ; offset++) {
      let visited = false;

      const left = nearest - offset;

      if (left >= lo && left <= hi) {
        current[k] = left;

        const y = diagonal * left + centerNumerator;

        const next = partial + y * y;

        if (next < bestLen2) {
          enumerate(k - 1, next);
        }

        visited = true;
      }

      if (offset !== 0) {
        const right = nearest + offset;

        if (right >= lo && right <= hi) {
          current[k] = right;

          const y = diagonal * right + centerNumerator;

          const next = partial + y * y;

          if (next < bestLen2) {
            enumerate(k - 1, next);
          }

          visited = true;
        }
      }

      if (!visited) break;

      if (nearest - offset < lo && nearest + offset > hi) {
        break;
      }
    }
  }

  enumerate(m - 1, 0);

  return best;
}

/* -------------------------------------------------------------------------- */
/* Block transformations                                                      */
/* -------------------------------------------------------------------------- */

function applyBlockTransform(
  basis: Float64Array,
  transform: Float64Array,
  n: number,
  cur: number,
  m: number,
  M: Float64Array,
): void {
  const oldBasis = new Float64Array(m * n);
  const oldTransform = new Float64Array(m * n);

  for (let r = 0; r < m; r++) {
    const src = (cur + r) * n;
    const dst = r * n;

    for (let c = 0; c < n; c++) {
      oldBasis[dst + c] = basis[src + c];

      oldTransform[dst + c] = transform[src + c];
    }
  }

  for (let r = 0; r < m; r++) {
    const mo = r * m;

    for (let c = 0; c < n; c++) {
      let value = 0;

      for (let k = 0; k < m; k++) {
        value += M[mo + k] * oldBasis[k * n + c];
      }

      basis[(cur + r) * n + c] = value;
    }
  }

  for (let r = 0; r < m; r++) {
    const mo = r * m;

    for (let c = 0; c < n; c++) {
      let value = 0;

      for (let k = 0; k < m; k++) {
        value += M[mo + k] * oldTransform[k * n + c];
      }

      transform[(cur + r) * n + c] = value;
    }
  }
}

/**
 * Size-reduce rows after the newly fixed row.
 *
 * For each later row b_j:
 *
 *     b_j <- b_j - round(<b_j,b_i>/<b_i,b_i>) b_i
 *
 * The same row operation is applied to the accumulated transformation.
 *
 * This is essential for the usual Gauss/Minkowski representative and is
 * especially important in dimension 2.
 */
function sizeReduceAgainst(
  basis: Float64Array,
  transform: Float64Array,
  n: number,
  fixed: number,
): void {
  const fo = fixed * n;

  let fixedNorm2 = 0;

  for (let k = 0; k < n; k++) {
    const x = basis[fo + k];
    fixedNorm2 += x * x;
  }

  if (fixedNorm2 === 0) {
    throw new Error("Internal error: zero vector during size reduction");
  }

  for (let row = fixed + 1; row < n; row++) {
    const ro = row * n;

    let dot = 0;

    for (let k = 0; k < n; k++) {
      dot += basis[ro + k] * basis[fo + k];
    }

    /*
     * Use nearest integer. This gives the standard size-reduced
     * representative.
     */
    const q = Math.round(dot / fixedNorm2);

    if (q === 0) continue;

    for (let k = 0; k < n; k++) {
      basis[ro + k] -= q * basis[fo + k];
    }

    const to = row * n;

    for (let k = 0; k < n; k++) {
      transform[to + k] -= q * transform[fo + k];
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main reduction                                                             */
/* -------------------------------------------------------------------------- */

function minkowskiReduce(
  basis: Float64Array,
  transform: Float64Array,
  n: number,
): void {
  // View over the working buffer (no copy): mutations to `basis` are visible.
  const B: Matrix = { rows: n, cols: n, data: basis };

  for (let cur = 0; cur < n - 1; cur++) {
    const m = n - cur;

    const G = buildProjectedGram(B, cur);

    const shortest = shortestPrimitive(G, m);

    const M = completeToUnimodular(shortest, m);

    applyBlockTransform(basis, transform, n, cur, m, M);

    /*
     * Projection determines a coset modulo the fixed span, but does not
     * choose the shortest representative in that coset. Size reduction
     * supplies the canonical short representative.
     */
    sizeReduceAgainst(basis, transform, n, cur);
  }
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function minkowski(input: Matrix): MinkowskiResult {
  if (input.rows !== input.cols) {
    throw new Error(
      `Minkowski reduction requires a square matrix, got ${input.rows}×${input.cols}`,
    );
  }

  const n = input.rows;

  if (n === 0) {
    return {
      basis: createMatrix(0, 0, new Float64Array(0)),
      transform: createMatrix(0, 0, new Float64Array(0)),
    };
  }

  if (Math.abs(determinant(input)) < 1e-9) {
    throw new Error("Minkowski reduction requires a full-rank lattice");
  }

  if (n === 1) {
    return {
      basis: createMatrix(1, 1, new Float64Array(input.data)),
      transform: createMatrix(1, 1, new Float64Array([1])),
    };
  }

  const basis = new Float64Array(input.data);

  const transform = new Float64Array(n * n);

  for (let i = 0; i < n; i++) {
    transform[i * n + i] = 1;
  }

  minkowskiReduce(basis, transform, n);

  return {
    basis: createMatrix(n, n, basis),
    transform: createMatrix(n, n, transform),
  };
}
