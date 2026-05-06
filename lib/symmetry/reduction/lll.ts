/**
 * LLL (Lenstra–Lenstra–Lovász) lattice basis reduction.
 *
 * Ported from pymatgen
 */

import { CartesianCoords } from "../../io/common";
import { dot, setColumn, getColumn } from "../../math/matrix";

const EPS = 1e-12;

const sub = (x: number[], y: number[], q: number) =>
  x.map((v, i) => v - q * y[i]);

const safeDiv = (num: number, denom: number) =>
  num / (Math.abs(denom) < EPS ? EPS : denom);

export function lll(
  matrix: CartesianCoords[],
  delta: number = 0.75,
): {
  lll_matrix: CartesianCoords[];
  transformationMatrix: CartesianCoords[];
} {
  const a = matrix.map((r) => [...r]);

  const b: CartesianCoords[] = Array.from({ length: 3 }, () => [0, 0, 0]);
  const u: CartesianCoords[] = Array.from({ length: 3 }, () => [0, 0, 0]);
  const m = [0, 0, 0];

  const transformationMatrix: CartesianCoords[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  // -------------------------
  // Gram-Schmidt initialization
  // -------------------------

  setColumn(b, 0, getColumn(a, 0));
  m[0] = Math.max(dot(getColumn(b, 0), getColumn(b, 0)), EPS);

  for (let i = 1; i < 3; i++) {
    for (let j = 0; j < i; j++) {
      u[i][j] = safeDiv(dot(getColumn(a, i), getColumn(b, j)), m[j]);
    }

    let bi = getColumn(a, i).slice();

    for (let j = 0; j < i; j++) {
      bi = sub(bi, getColumn(b, j), u[i][j]);
    }

    setColumn(b, i, bi);
    m[i] = Math.max(dot(bi, bi), EPS);
  }

  // -------------------------
  // LLL loop
  // -------------------------

  let k = 1;
  let iter = 0;

  while (k < 3 && iter++ < 100) {
    // size reduction
    for (let i = k - 1; i >= 0; i--) {
      const q = Math.round(u[k][i]);

      if (q !== 0) {
        for (let r = 0; r < 3; r++) {
          a[r][k] -= q * a[r][i];
          transformationMatrix[r][k] -= q * transformationMatrix[r][i];
        }
      }
    }

    // recompute GS for k
    for (let j = 0; j < k; j++) {
      u[k][j] = safeDiv(dot(getColumn(a, k), getColumn(b, j)), m[j]);
    }

    const bk = getColumn(b, k);
    const bk1 = getColumn(b, k - 1);

    const lhs = dot(bk, bk);
    const rhs = (delta - u[k][k - 1] ** 2) * dot(bk1, bk1);

    if (lhs >= rhs) {
      k++;
    } else {
      // swap basis vectors
      for (let r = 0; r < 3; r++) {
        [a[r][k], a[r][k - 1]] = [a[r][k - 1], a[r][k]];
        [transformationMatrix[r][k], transformationMatrix[r][k - 1]] = [
          transformationMatrix[r][k - 1],
          transformationMatrix[r][k],
        ];
      }

      // recompute GS for k and k-1
      for (let s = k - 1; s <= k; s++) {
        const colA = getColumn(a, s);

        for (let j = 0; j < s; j++) {
          u[s][j] = safeDiv(dot(colA, getColumn(b, j)), m[j]);
        }

        let bs = colA.slice();

        for (let j = 0; j < s; j++) {
          bs = sub(bs, getColumn(b, j), u[s][j]);
        }

        setColumn(b, s, bs);
        m[s] = Math.max(dot(bs, bs), EPS);
      }

      if (k > 1) k--;
    }
  }

  // -------------------------
  // output
  // -------------------------

  const transpose = (M: CartesianCoords[]) =>
    M[0].map((_, i) => M.map((r) => r[i]));

  return {
    lll_matrix: transpose(a),
    transformationMatrix: transpose(transformationMatrix),
  };
}
