import { Matrix, createMatrix } from "../../matrix";
import { col, setCol } from "../col";
import { dot } from "../vector/dot";

const EPS = 1e-12;

function sub(a: number[], b: number[], q: number) {
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i] - q * b[i];
  }
  return out;
}

function safeDiv(num: number, denom: number) {
  return num / (Math.abs(denom) < EPS ? EPS : denom);
}

function vecToMatrix(v: number[]): Matrix {
  return createMatrix(v.length, 1, v);
}

function colVec(m: Matrix, i: number): Matrix {
  return vecToMatrix(Array.from(col(m, i)));
}

export function lll(matrix: Matrix, delta = 0.75) {
  const n = matrix.cols;

  const a: number[][] = [];
  for (let i = 0; i < n; i++) {
    a[i] = Array.from(col(matrix, i));
  }

  const b: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const u: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const m: number[] = Array(n).fill(0);

  const transform = createMatrix(
    n,
    n,
    Array.from({ length: n * n }, (_, i) => (i % (n + 1) === 0 ? 1 : 0)),
  );

  // Gram-Schmidt
  b[0] = [...a[0]];
  m[0] = Math.max(dot(colVec(matrix, 0), colVec(matrix, 0)), EPS);

  for (let i = 1; i < n; i++) {
    let bi = [...a[i]];

    for (let j = 0; j < i; j++) {
      u[i][j] = safeDiv(dot(colVec(matrix, i), colVec(matrix, j)), m[j]);

      bi = sub(bi, b[j], u[i][j]);
    }

    b[i] = bi;
    m[i] = Math.max(dot(vecToMatrix(bi), vecToMatrix(bi)), EPS);
  }

  // main loop
  let k = 1;
  let iter = 0;

  while (k < n && iter++ < 1000) {
    for (let i = k - 1; i >= 0; i--) {
      const q = Math.round(u[k][i]);
      if (!q) continue;

      for (let r = 0; r < n; r++) {
        a[r][k] -= q * a[r][i];
      }

      const colK = Array.from(col(transform, k));
      const colI = Array.from(col(transform, i));

      for (let r = 0; r < n; r++) {
        colK[r] -= q * colI[r];
      }

      setCol(transform, k, colK);
    }

    for (let j = 0; j < k; j++) {
      u[k][j] = safeDiv(dot(vecToMatrix(a[k]), vecToMatrix(b[j])), m[j]);
    }

    const bk = vecToMatrix(b[k]);
    const bk1 = vecToMatrix(b[k - 1]);

    const lhs = dot(bk, bk);
    const rhs = (delta - u[k][k - 1] ** 2) * dot(bk1, bk1);

    if (lhs >= rhs) {
      k++;
    } else {
      for (let r = 0; r < n; r++) {
        [a[r][k], a[r][k - 1]] = [a[r][k - 1], a[r][k]];
      }

      for (let r = 0; r < n; r++) {
        const colK = Array.from(col(transform, k));
        const colP = Array.from(col(transform, k - 1));

        [colK[r], colP[r]] = [colP[r], colK[r]];

        setCol(transform, k, colK);
        setCol(transform, k - 1, colP);
      }

      if (k > 1) k--;
    }
  }

  return {
    reduced: createMatrix(n, n, transposeLike(a).flat()),
    transform,
  };
}

function transposeLike(M: number[][]) {
  return M[0].map((_, i) => M.map((r) => r[i]));
}
