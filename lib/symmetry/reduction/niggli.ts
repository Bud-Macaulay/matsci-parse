import { CartesianCoords } from "../../io/common";
import { cellParamsToLattice, dot } from "../../math/matrix";
import { lll } from "./lll";

function safeAcos(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.acos(Math.min(1, Math.max(-1, x)));
}

function transpose3(A: number[][]): number[][] {
  return A[0].map((_, i) => A.map((r) => r[i]));
}

/**
 * Niggli reduction (direct port of pymatgen algorithm).
 * LLL-preprocessed lattice → metric tensor → A1–A8 reduction loop.
 */
/**
 * Niggli reduction (faithful port of pymatgen algorithm).
 * LLL-preprocessed lattice → metric tensor → A1–A8 reduction loop.
 */

import { CartesianCoords } from "../../io/common";
import { dot, setColumn, getColumn } from "../../math/matrix";
import { lll } from "./lll";

const EPS = 1e-12;

function matmul3(A: number[][], B: number[][]): number[][] {
  const R = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        R[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return R;
}

function identity3(): number[][] {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

const clamp = (x: number) => Math.max(-1, Math.min(1, x));

function det3(M: number[][]) {
  return (
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
  );
}

export function niggli(matrix: CartesianCoords[], tol = 1e-5) {
  // -------------------------
  // LLL preprocessing (pymatgen)
  // -------------------------
  const lllResult = lll(matrix);
  let lattice = lllResult.lll_matrix.map((r) => [...r]);

  let M = identity3();

  // -------------------------
  // volume-scaled tolerance
  // -------------------------
  const volume = Math.abs(det3(lattice));
  const e = tol * Math.cbrt(volume + EPS);

  const metric = (A: number[][]) => {
    const a = A[0];
    const b = A[1];
    const c = A[2];

    return [
      dot(a, a),
      dot(b, b),
      dot(c, c),
      2 * dot(b, c),
      2 * dot(a, c),
      2 * dot(a, b),
    ];
  };

  for (let iter = 0; iter < 100; iter++) {
    let [A, B, C, E, N, Y] = metric(lattice);

    // -------------------------
    // A1
    // -------------------------
    if (B + e < A || (Math.abs(A - B) < e && Math.abs(E) > Math.abs(N) + e)) {
      const T = [
        [0, -1, 0],
        [-1, 0, 0],
        [0, 0, -1],
      ];
      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    // -------------------------
    // A2
    // -------------------------
    if (C + e < B || (Math.abs(B - C) < e && Math.abs(N) > Math.abs(Y) + e)) {
      const T = [
        [-1, 0, 0],
        [0, 0, -1],
        [0, -1, 0],
      ];
      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    const ll = Math.abs(E) < e ? 0 : E / Math.abs(E);
    const m = Math.abs(N) < e ? 0 : N / Math.abs(N);
    const n = Math.abs(Y) < e ? 0 : Y / Math.abs(Y);

    // -------------------------
    // A3
    // -------------------------
    if (ll * m * n === 1) {
      const T = [
        [ll === -1 ? -1 : 1, 0, 0],
        [0, m === -1 ? -1 : 1, 0],
        [0, 0, n === -1 ? -1 : 1],
      ];
      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    // -------------------------
    // A4
    // -------------------------
    if (ll * m * n === 0 || ll * m * n === -1) {
      let i = ll === 1 ? -1 : 1;
      let j = m === 1 ? -1 : 1;
      let k = n === 1 ? -1 : 1;

      if (i * j * k === -1) {
        if (n === 0) k = -1;
        else if (m === 0) j = -1;
        else if (ll === 0) i = -1;
      }

      const T = [
        [i, 0, 0],
        [0, j, 0],
        [0, 0, k],
      ];

      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    [A, B, C, E, N, Y] = metric(lattice);

    // -------------------------
    // A5
    // -------------------------
    if (
      Math.abs(E) > B + e ||
      (Math.abs(E - B) < e && Y - e > 2 * N) ||
      (Math.abs(E + B) < e && -e > Y)
    ) {
      const s = E === 0 ? 1 : -Math.sign(E);
      const T = [
        [1, 0, 0],
        [0, 1, -s],
        [0, 0, 1],
      ];
      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    // -------------------------
    // A6
    // -------------------------
    if (
      Math.abs(N) > A + e ||
      (Math.abs(A - N) < e && Y - e > 2 * E) ||
      (Math.abs(A + N) < e && -e > Y)
    ) {
      const s = N === 0 ? 1 : -Math.sign(N);
      const T = [
        [1, 0, -s],
        [0, 1, 0],
        [0, 0, 1],
      ];
      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    // -------------------------
    // A7
    // -------------------------
    if (
      Math.abs(Y) > A + e ||
      (Math.abs(A - Y) < e && N - e > 2 * E) ||
      (Math.abs(A + Y) < e && -e > N)
    ) {
      const s = Y === 0 ? 1 : -Math.sign(Y);
      const T = [
        [1, -s, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    // -------------------------
    // A8
    // -------------------------
    if (-e > E + N + Y + A + B) {
      const T = [
        [1, 0, 1],
        [0, 1, 1],
        [0, 0, 1],
      ];
      lattice = matmul3(T, lattice);
      M = matmul3(T, M);
      continue;
    }

    break;
  }

  // -------------------------
  // reconstruct cell parameters (SAFE)
  // -------------------------
  const [A, B, C, E, N, Y] = metric(lattice);

  const a = Math.sqrt(Math.max(A, 0));
  const b = Math.sqrt(Math.max(B, 0));
  const c = Math.sqrt(Math.max(C, 0));

  const alpha = (Math.acos(clamp(E / (2 * b * c + EPS))) * 180) / Math.PI;
  const beta = (Math.acos(clamp(N / (2 * a * c + EPS))) * 180) / Math.PI;
  const gamma = (Math.acos(clamp(Y / (2 * a * b + EPS))) * 180) / Math.PI;

  const reduced = {
    a,
    b,
    c,
    alpha,
    beta,
    gamma,
  };

  return {
    lattice: reduced,
    transformationMatrix: M,
  };
}
