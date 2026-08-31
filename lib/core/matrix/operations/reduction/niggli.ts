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

interface KernelOut {
  l: number;
  m: number;
  n: number;
  ok: boolean;
}

function niggliKernel(
  input: Float64Array,
  basis: Float64Array,
  transform: Int32Array | null,
  eps: number,
  out: KernelOut,
): void {
  const r = transform;

  // Scalarized 3×3 basis (rows are lattice vectors). Operated on directly and
  // written back to `basis` only once the reduction converges.
  let b00 = input[0];
  let b01 = input[1];
  let b02 = input[2];
  let b10 = input[3];
  let b11 = input[4];
  let b12 = input[5];
  let b20 = input[6];
  let b21 = input[7];
  let b22 = input[8];

  // --- Initial metric parameters ---
  let A = b00 * b00 + b01 * b01 + b02 * b02;
  let B = b10 * b10 + b11 * b11 + b12 * b12;
  let C = b20 * b20 + b21 * b21 + b22 * b22;
  let zeta = 2 * (b00 * b10 + b01 * b11 + b02 * b12);
  let eta = 2 * (b00 * b20 + b01 * b21 + b02 * b22);
  let xi = 2 * (b10 * b20 + b11 * b21 + b12 * b22);

  let l = 0;
  let m = 0;
  let n = 0;

  const maxAttempts = 1000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // ---- Step 1: r0 = −r1, r1 = −r0, r2 = −r2 ----
    // (A,B,C,xi,eta,zeta) -> (B,A,C,eta,xi,zeta)
    if (A > B + eps || (Math.abs(A - B) <= eps && Math.abs(xi) > Math.abs(eta) + eps)) {
      let t00 = b00;
      b00 = -b10; b10 = -t00;
      let t01 = b01;
      b01 = -b11; b11 = -t01;
      let t02 = b02;
      b02 = -b12; b12 = -t02;
      b20 = -b20; b21 = -b21; b22 = -b22;
      if (r) {
        let t: number;
        t = r[0]; r[0] = -r[3]; r[3] = -t;
        t = r[1]; r[1] = -r[4]; r[4] = -t;
        t = r[2]; r[2] = -r[5]; r[5] = -t;
        r[6] = -r[6]; r[7] = -r[7]; r[8] = -r[8];
      }
      const tA = A;
      const txi = xi;
      A = B;
      B = tA;
      xi = eta;
      eta = txi;
    }

    // ---- Step 2: r0 = −r0, r1 = −r2, r2 = −r1 ----
    // (A,B,C,xi,eta,zeta) -> (A,C,B,xi,zeta,eta)
    if (B > C + eps || (Math.abs(B - C) <= eps && Math.abs(eta) > Math.abs(zeta) + eps)) {
      b00 = -b00; b01 = -b01; b02 = -b02;
      let t0 = b10;
      b10 = -b20; b20 = -t0;
      let t1 = b11;
      b11 = -b21; b21 = -t1;
      let t2 = b12;
      b12 = -b22; b22 = -t2;
      if (r) {
        let t: number;
        r[0] = -r[0]; r[1] = -r[1]; r[2] = -r[2];
        t = r[3]; r[3] = -r[6]; r[6] = -t;
        t = r[4]; r[4] = -r[7]; r[7] = -t;
        t = r[5]; r[5] = -r[8]; r[8] = -t;
      }
      const tB = B;
      const teta = eta;
      B = C;
      C = tB;
      eta = zeta;
      zeta = teta;
      continue;
    }

    // ---- Step 3: sign flip so l·m·n = 1 ----
    l = xi < -eps ? -1 : xi > eps ? 1 : 0;
    m = eta < -eps ? -1 : eta > eps ? 1 : 0;
    n = zeta < -eps ? -1 : zeta > eps ? 1 : 0;
    if (l * m * n === 1) {
      const i = l === -1 ? -1 : 1;
      const j = m === -1 ? -1 : 1;
      const k = n === -1 ? -1 : 1;
      b00 *= i; b01 *= i; b02 *= i;
      b10 *= j; b11 *= j; b12 *= j;
      b20 *= k; b21 *= k; b22 *= k;
      if (r) {
        r[0] *= i; r[1] *= i; r[2] *= i;
        r[3] *= j; r[4] *= j; r[5] *= j;
        r[6] *= k; r[7] *= k; r[8] *= k;
      }
      zeta *= i * j;
      eta *= i * k;
      xi *= j * k;
    }

    // ---- Step 4: further sign flips when l·m·n ∈ {0, −1} ----
    if (!(l === -1 && m === -1 && n === -1)) {
      if (l * m * n === 0 || l * m * n === -1) {
        let i = 1;
        let j = 1;
        let k = 1;
        let which = -1;
        if (l === 1) i = -1;
        if (l === 0) which = 0;
        if (m === 1) j = -1;
        if (m === 0) which = 1;
        if (n === 1) k = -1;
        if (n === 0) which = 2;

        if (i * j * k === -1) {
          if (which === 0) i = -1;
          if (which === 1) j = -1;
          if (which === 2) k = -1;
        }

        b00 *= i; b01 *= i; b02 *= i;
        b10 *= j; b11 *= j; b12 *= j;
        b20 *= k; b21 *= k; b22 *= k;
        if (r) {
          r[0] *= i; r[1] *= i; r[2] *= i;
          r[3] *= j; r[4] *= j; r[5] *= j;
          r[6] *= k; r[7] *= k; r[8] *= k;
        }
        zeta *= i * j;
        eta *= i * k;
        xi *= j * k;
      }
    }

    // ---- Step 5: r2 += sign · r1 ----
    if (
      Math.abs(xi) > B + eps ||
      (Math.abs(B - xi) <= eps && 2 * eta < zeta - eps) ||
      (Math.abs(B + xi) <= eps && zeta < -eps)
    ) {
      const s: number = xi > 0 ? -1 : 1;
      b20 += s * b10; b21 += s * b11; b22 += s * b12;
      if (r) {
        r[6] += s * r[3]; r[7] += s * r[4]; r[8] += s * r[5];
      }
      C += s * xi + B;
      xi = xi + 2 * s * B;
      eta = eta + s * zeta;
      continue;
    }

    // ---- Step 6: r2 += sign · r0 ----
    if (
      Math.abs(eta) > A + eps ||
      (Math.abs(A - eta) <= eps && 2 * xi < zeta - eps) ||
      (Math.abs(A + eta) <= eps && zeta < -eps)
    ) {
      const s: number = eta > 0 ? -1 : 1;
      b20 += s * b00; b21 += s * b01; b22 += s * b02;
      if (r) {
        r[6] += s * r[0]; r[7] += s * r[1]; r[8] += s * r[2];
      }
      C += s * eta + A;
      xi = xi + s * zeta;
      eta = eta + 2 * s * A;
      continue;
    }

    // ---- Step 7: r1 += sign · r0 ----
    if (
      Math.abs(zeta) > A + eps ||
      (Math.abs(A - zeta) <= eps && 2 * xi < eta - eps) ||
      (Math.abs(A + zeta) <= eps && eta < -eps)
    ) {
      const s: number = zeta > 0 ? -1 : 1;
      b10 += s * b00; b11 += s * b01; b12 += s * b02;
      if (r) {
        r[3] += s * r[0]; r[4] += s * r[1]; r[5] += s * r[2];
      }
      B += s * zeta + A;
      xi = xi + s * eta;
      zeta = zeta + 2 * s * A;
      continue;
    }

    // ---- Step 8: r2 += r0 + r1 ----
    {
      const sum = xi + eta + zeta + A + B;
      if (
        sum < -eps ||
        (Math.abs(sum) <= eps && 2 * (A + eta) + zeta > eps)
      ) {
        b20 += b00 + b10; b21 += b01 + b11; b22 += b02 + b12;
        if (r) {
          r[6] += r[0] + r[3]; r[7] += r[1] + r[4]; r[8] += r[2] + r[5];
        }
        C += A + B + xi + eta + zeta;
        xi = xi + zeta + 2 * B;
        eta = eta + zeta + 2 * A;
        continue;
      }
    }

    // No step fired: converged.
    out.l = l;
    out.m = m;
    out.n = n;
    out.ok = true;
    basis[0] = b00; basis[1] = b01; basis[2] = b02;
    basis[3] = b10; basis[4] = b11; basis[5] = b12;
    basis[6] = b20; basis[7] = b21; basis[8] = b22;
    return;
  }

  basis[0] = b00; basis[1] = b01; basis[2] = b02;
  basis[3] = b10; basis[4] = b11; basis[5] = b12;
  basis[6] = b20; basis[7] = b21; basis[8] = b22;
  out.ok = false;
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
  const basis = new Float64Array(input.data);
  const transform = new Int32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const out: KernelOut = { l: 0, m: 0, n: 0, ok: false };
  niggliKernel(input.data, basis, transform, eps, out);
  if (!out.ok) return null;

  return {
    basis: createMatrix(3, 3, basis),
    transform: createMatrix(3, 3, transform),
  };
}
