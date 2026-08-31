/**
 * Niggli reduction of a lattice basis.
 *
 * Produces the unique, canonical (Niggli) cell of a 3D lattice. The lattice is
 * given as a 3×3 matrix whose **rows** are the lattice vectors. The result is a
 * reduced basis spanning the same lattice, together with the unimodular
 * transformation matrix `T` such that `reduced = T × original` (row vectors).
 *
 * Unlike LLL (which returns *a* short basis), Niggli reduction is a
 * normalization: its result is unique, which is why seekpath and
 * crystallography use it (e.g. to canonicalise the triclinic aP cell).
 *
 * This is a faithful port of spglib's `niggli_reduce` (Grosse-Kunstleve
 * 8-step algorithm), using the same `eps` tolerance semantics. The exported
 * `niggli` operates on row-vector bases and produces output matching spglib's
 * `niggli_reduce` for the same row-major lattice array.
 *
 * The iteration is hand-unrolled: no step-transform matrices are materialised
 * and no generic 3×3 matrix multiplication runs in the hot path. Each step is
 * a sparse in-place row operation on the basis (a permutation/sign-flip or a
 * single-row shear), which is far cheaper than a general matmul.
 *
 * The basis is kept in the same row-vector arrangement as the public API, so
 * no transposition is ever needed: the input is reduced in place and returned
 * directly. The Gram matrix is symmetric, so the metric and its analytic
 * updates are identical whether the vectors are treated as rows or columns;
 * only the orientation of the sparse in-place mutations differs.
 *
 * @see https://github.com/spglib/spglib/blob/master/src/niggli.c
 */

import { Matrix, createMatrix } from "../../matrix";

/**
 * Internal state for the Niggli iteration.
 *
 * Row-vector convention: the internal basis rows are the lattice vectors,
 * matching the exported API exactly (hence no transpose is required). The
 * mutations are sparse in-place row operations.
 */
interface NiggliState {
  A: number;
  B: number;
  C: number;
  xi: number;
  eta: number;
  zeta: number;
  eps: number;
  l: number;
  m: number;
  n: number;
  /** Current 3×3 row-major basis (rows are lattice vectors). */
  basis: Float64Array;
  /**
   * Accumulated unimodular transform T such that basis = T × original
   * (left-multiply, row-vector convention). The returned `transform` is this
   * matrix itself. Always integer-valued, so stored as Int32Array.
   */
  rightTransform: Int32Array;
}

/**
 * Recompute the metric parameters (A, B, C, xi, eta, zeta) from the current
 * basis and classify the off-diagonal angle types (l, m, n) in one pass.
 *
 * Rows r0 = b[0..2], r1 = b[3..5], r2 = b[6..8] are the lattice vectors:
 *   A = |r0|², B = |r1|², C = |r2|²
 *   zeta = 2·(r0·r1), eta = 2·(r0·r2), xi = 2·(r1·r2)
 */
function setParameters(p: NiggliState): void {
  const b = p.basis;

  const A = b[0] * b[0] + b[1] * b[1] + b[2] * b[2];
  const B = b[3] * b[3] + b[4] * b[4] + b[5] * b[5];
  const C = b[6] * b[6] + b[7] * b[7] + b[8] * b[8];

  const zeta = 2 * (b[0] * b[3] + b[1] * b[4] + b[2] * b[5]);
  const eta = 2 * (b[0] * b[6] + b[1] * b[7] + b[2] * b[8]);
  const xi = 2 * (b[3] * b[6] + b[4] * b[7] + b[5] * b[8]);

  p.A = A;
  p.B = B;
  p.C = C;
  p.xi = xi;
  p.eta = eta;
  p.zeta = zeta;

  const eps = p.eps;
  p.l = xi < -eps ? -1 : xi > eps ? 1 : 0;
  p.m = eta < -eps ? -1 : eta > eps ? 1 : 0;
  p.n = zeta < -eps ? -1 : zeta > eps ? 1 : 0;
}

/**
 * Each `stepN` probes the current metric parameters; if it fires it applies
 * the corresponding sparse in-place row operation to both the basis and the
 * accumulated unimodular transform, updates the metric parameters
 * analytically, and returns `true`. Returns `false` without mutating anything
 * otherwise. The mutation, metric update, and angle re-classification are all
 * inlined into the same function to avoid per-step call overhead.
 */

/** r0 = −r1, r1 = −r0, r2 = −r2; (A,B,C,xi,eta,zeta) → (B,A,C,eta,xi,zeta) */
function step1(p: NiggliState): boolean {
  const e = p.eps;
  if (
    p.A > p.B + e ||
    (Math.abs(p.A - p.B) <= e && Math.abs(p.xi) > Math.abs(p.eta) + e)
  ) {
    const b = p.basis;
    const r = p.rightTransform;
    let t: number;
    t = b[0]; b[0] = -b[3]; b[3] = -t;
    t = b[1]; b[1] = -b[4]; b[4] = -t;
    t = b[2]; b[2] = -b[5]; b[5] = -t;
    b[6] = -b[6]; b[7] = -b[7]; b[8] = -b[8];
    t = r[0]; r[0] = -r[3]; r[3] = -t;
    t = r[1]; r[1] = -r[4]; r[4] = -t;
    t = r[2]; r[2] = -r[5]; r[5] = -t;
    r[6] = -r[6]; r[7] = -r[7]; r[8] = -r[8];

    const A = p.A;
    const B = p.B;
    const xi = p.xi;
    const eta = p.eta;
    p.A = B;
    p.B = A;
    p.xi = eta;
    p.eta = xi;

    p.l = p.xi < -e ? -1 : p.xi > e ? 1 : 0;
    p.m = p.eta < -e ? -1 : p.eta > e ? 1 : 0;
    return true;
  }
  return false;
}

/** r0 = −r0, r1 = −r2, r2 = −r1; (A,B,C,xi,eta,zeta) → (A,C,B,xi,zeta,eta) */
function step2(p: NiggliState): boolean {
  const e = p.eps;
  if (
    p.B > p.C + e ||
    (Math.abs(p.B - p.C) <= e && Math.abs(p.eta) > Math.abs(p.zeta) + e)
  ) {
    const b = p.basis;
    const r = p.rightTransform;
    let t: number;
    b[0] = -b[0]; b[1] = -b[1]; b[2] = -b[2];
    t = b[3]; b[3] = -b[6]; b[6] = -t;
    t = b[4]; b[4] = -b[7]; b[7] = -t;
    t = b[5]; b[5] = -b[8]; b[8] = -t;
    r[0] = -r[0]; r[1] = -r[1]; r[2] = -r[2];
    t = r[3]; r[3] = -r[6]; r[6] = -t;
    t = r[4]; r[4] = -r[7]; r[7] = -t;
    t = r[5]; r[5] = -r[8]; r[8] = -t;

    const B = p.B;
    const C = p.C;
    const eta = p.eta;
    const zeta = p.zeta;
    p.B = C;
    p.C = B;
    p.eta = zeta;
    p.zeta = eta;

    p.m = p.eta < -e ? -1 : p.eta > e ? 1 : 0;
    p.n = p.zeta < -e ? -1 : p.zeta > e ? 1 : 0;
    return true;
  }
  return false;
}

/** r0 *= i, r1 *= j, r2 *= k; A,B,C unchanged; off-diagonals pick up sign */
function applySignFlip(p: NiggliState, i: number, j: number, k: number): void {
  const b = p.basis;
  const r = p.rightTransform;
  b[0] *= i; b[1] *= i; b[2] *= i;
  b[3] *= j; b[4] *= j; b[5] *= j;
  b[6] *= k; b[7] *= k; b[8] *= k;
  r[0] *= i; r[1] *= i; r[2] *= i;
  r[3] *= j; r[4] *= j; r[5] *= j;
  r[6] *= k; r[7] *= k; r[8] *= k;

  p.zeta *= i * j;
  p.eta *= i * k;
  p.xi *= j * k;

  const e = p.eps;
  p.l = p.xi < -e ? -1 : p.xi > e ? 1 : 0;
  p.m = p.eta < -e ? -1 : p.eta > e ? 1 : 0;
  p.n = p.zeta < -e ? -1 : p.zeta > e ? 1 : 0;
}

function step3(p: NiggliState): boolean {
  const { l, m, n } = p;
  if (l * m * n === 1) {
    applySignFlip(p, l === -1 ? -1 : 1, m === -1 ? -1 : 1, n === -1 ? -1 : 1);
    return true;
  }
  return false;
}

function step4(p: NiggliState): boolean {
  const { l, m, n } = p;
  if (l === -1 && m === -1 && n === -1) {
    return false;
  }

  if (l * m * n === 0 || l * m * n === -1) {
    let i = 1;
    let j = 1;
    let k = 1;
    let r = -1; // 0: i, 1: j, 2: k
    if (l === 1) i = -1;
    if (l === 0) r = 0;
    if (m === 1) j = -1;
    if (m === 0) r = 1;
    if (n === 1) k = -1;
    if (n === 0) r = 2;

    if (i * j * k === -1) {
      if (r === 0) i = -1;
      if (r === 1) j = -1;
      if (r === 2) k = -1;
    }

    applySignFlip(p, i, j, k);
    return true;
  }

  return false;
}

/** r2 += sign · r1 */
function step5(p: NiggliState): boolean {
  const { xi, B, eta, zeta, eps } = p;
  if (
    Math.abs(xi) > B + eps ||
    (Math.abs(B - xi) <= eps && 2 * eta < zeta - eps) ||
    (Math.abs(B + xi) <= eps && zeta < -eps)
  ) {
    const s: number = xi > 0 ? -1 : 1;
    const b = p.basis;
    const r = p.rightTransform;
    b[6] += s * b[3]; b[7] += s * b[4]; b[8] += s * b[5];
    r[6] += s * r[3]; r[7] += s * r[4]; r[8] += s * r[5];

    p.C += s * xi + B;
    p.xi = xi + 2 * s * B;
    p.eta = eta + s * zeta;

    p.l = p.xi < -eps ? -1 : p.xi > eps ? 1 : 0;
    p.m = p.eta < -eps ? -1 : p.eta > eps ? 1 : 0;
    return true;
  }
  return false;
}

/** r2 += sign · r0 */
function step6(p: NiggliState): boolean {
  const { eta, A, xi, zeta, eps } = p;
  if (
    Math.abs(eta) > A + eps ||
    (Math.abs(A - eta) <= eps && 2 * xi < zeta - eps) ||
    (Math.abs(A + eta) <= eps && zeta < -eps)
  ) {
    const s: number = eta > 0 ? -1 : 1;
    const b = p.basis;
    const r = p.rightTransform;
    b[6] += s * b[0]; b[7] += s * b[1]; b[8] += s * b[2];
    r[6] += s * r[0]; r[7] += s * r[1]; r[8] += s * r[2];

    p.C += s * eta + A;
    p.xi = xi + s * zeta;
    p.eta = eta + 2 * s * A;

    p.l = p.xi < -eps ? -1 : p.xi > eps ? 1 : 0;
    p.m = p.eta < -eps ? -1 : p.eta > eps ? 1 : 0;
    return true;
  }
  return false;
}

/** r1 += sign · r0 */
function step7(p: NiggliState): boolean {
  const { zeta, A, xi, eta, eps } = p;
  if (
    Math.abs(zeta) > A + eps ||
    (Math.abs(A - zeta) <= eps && 2 * xi < eta - eps) ||
    (Math.abs(A + zeta) <= eps && eta < -eps)
  ) {
    const s: number = zeta > 0 ? -1 : 1;
    const b = p.basis;
    const r = p.rightTransform;
    b[3] += s * b[0]; b[4] += s * b[1]; b[5] += s * b[2];
    r[3] += s * r[0]; r[4] += s * r[1]; r[5] += s * r[2];

    p.B += s * zeta + A;
    p.xi = xi + s * eta;
    p.zeta = zeta + 2 * s * A;

    p.l = p.xi < -eps ? -1 : p.xi > eps ? 1 : 0;
    p.n = p.zeta < -eps ? -1 : p.zeta > eps ? 1 : 0;
    return true;
  }
  return false;
}

/** r2 += r0 + r1 */
function step8(p: NiggliState): boolean {
  const { xi, eta, zeta, A, B, eps } = p;
  const sum = xi + eta + zeta + A + B;
  if (
    sum < -eps ||
    (Math.abs(sum) <= eps && 2 * (A + eta) + zeta > eps)
  ) {
    const b = p.basis;
    const r = p.rightTransform;
    b[6] += b[0] + b[3]; b[7] += b[1] + b[4]; b[8] += b[2] + b[5];
    r[6] += r[0] + r[3]; r[7] += r[1] + r[4]; r[8] += r[2] + r[5];

    p.C += A + B + xi + eta + zeta;
    p.xi = xi + zeta + 2 * B;
    p.eta = eta + zeta + 2 * A;

    p.l = p.xi < -eps ? -1 : p.xi > eps ? 1 : 0;
    p.m = p.eta < -eps ? -1 : p.eta > eps ? 1 : 0;
    return true;
  }
  return false;
}

/**
 * Reduce a basis matrix with row-vector orientation (basis rows are the basis
 * vectors, transforms left-multiply).
 */
function reduce(
  input: Float64Array,
  eps: number,
): { basis: Float64Array; transform: Int32Array } | null {
  const p: NiggliState = {
    A: 0,
    B: 0,
    C: 0,
    xi: 0,
    eta: 0,
    zeta: 0,
    eps,
    l: 0,
    m: 0,
    n: 0,
    basis: new Float64Array(input),
    rightTransform: new Int32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  };

  setParameters(p);

  const maxAttempts = 1000;
  // Hand-unrolled Grosse-Kunstleve loop. After a step that requires re-scanning
  // from the start (2, 5, 6, 7, 8), restart the pass; otherwise fall through to
  // the next step with the freshly updated parameters.
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (step1(p)) {
      // fall through
    }
    if (step2(p)) {
      continue;
    }
    if (step3(p)) {
      // fall through
    }
    if (step4(p)) {
      // fall through
    }
    if (step5(p)) {
      continue;
    }
    if (step6(p)) {
      continue;
    }
    if (step7(p)) {
      continue;
    }
    if (step8(p)) {
      continue;
    }
    return { basis: p.basis, transform: p.rightTransform };
  }

  return null;
}

export interface NiggliResult {
  /** The Niggli-reduced basis (3×3, rows are lattice vectors). */
  basis: Matrix;
  /**
   * The unimodular transformation matrix `T` such that
   * `reduced = T × original` (row-vector convention).
   */
  transform: Matrix;
}

/**
 * Reduce a 3×3 lattice basis (rows = lattice vectors) to its unique Niggli
 * cell.
 *
 * @param input  A 3×3 matrix whose rows are the lattice vectors.
 * @param eps    Tolerance against which near-equalities are decided. Mirrors
 *               spglib's `symprec` (default `1e-5`).
 * @returns The reduced basis and transformation, or `null` if reduction did
 *          not converge.
 */
export function niggli(input: Matrix, eps = 1e-5): NiggliResult | null {
  if (input.rows !== 3 || input.cols !== 3) {
    throw new Error(
      `niggli requires a 3x3 matrix, got ${input.rows}×${input.cols}`,
    );
  }

  // The basis is kept in row-vector form throughout (rows are the lattice
  // vectors), so the input is reduced directly and the result returned as-is;
  // no transposition is needed. `rightTransform` accumulates the same row
  // operations, yielding directly the left-multiply form `reduced = T × input`.
  const res = reduce(new Float64Array(input.data), eps);
  if (!res) return null;

  return {
    basis: createMatrix(3, 3, res.basis),
    transform: createMatrix(3, 3, res.transform),
  };
}
