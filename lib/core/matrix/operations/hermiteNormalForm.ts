import { createMatrix, identity, index, type Matrix } from "../matrix";
import { add } from "./add";
import { determinant } from "./determinant";
import { mul } from "./mul";
import { outerProduct } from "./outerProduct";
import { row } from "./row";
import { scale } from "./scale";

// Elementary row operations, as left-multiplication by elementary matrices.
const get = (M: Matrix, i: number, j: number) => M.data[index(3, i, j)]!;
const unit = (i: number) => row(identity(3), i);

/** Row t += k * row s. */
const addScaledRow = (M: Matrix, t: number, s: number, k: number) =>
  mul(add(identity(3), scale(outerProduct(unit(t), unit(s)), k)), M);

/** Swap rows i and j. */
const swapRows = (M: Matrix, i: number, j: number) => {
  const order = [0, 1, 2].map((r) => (r === i ? j : r === j ? i : r));
  return mul(
    createMatrix(
      3,
      3,
      order.flatMap((r) => [...unit(r)]),
    ),
    M,
  );
};

/** Row i *= -1. */
const negateRow = (M: Matrix, i: number) => addScaledRow(M, i, i, -2);

/**
 * Canonical form of the integer lattice spanned by the rows of a
 * non-singular 3x3 integer matrix: the unique lower-triangular
 * `[[a,0,0],[b,c,0],[d,e,f]]` with a, c, f > 0, 0 <= b, d < a and
 * 0 <= e < c, reached by unimodular row operations. Two matrices span the
 * same lattice exactly when their forms are equal.
 *
 * @param M - Non-singular integer matrix (rows = lattice vectors).
 * @returns The Hermite normal form.
 */
export function hermiteNormalForm(M: Matrix): Matrix {
  if (M.rows !== 3 || M.cols !== 3) {
    throw new Error("hermiteNormalForm: expected a 3x3 matrix");
  }
  if (Math.abs(determinant(M)) < 0.5) {
    throw new Error("hermiteNormalForm: singular matrix");
  }
  let H = createMatrix(3, 3, Array.from(M.data, Math.round));

  // 1. Triangularize, right to left: for pivot p, run Euclid over rows
  //    0..p in column p until only row p is non-zero there.
  for (let p = 2; p >= 0; p--) {
    const rows = [...Array(p + 1).keys()];
    while (rows.some((i) => i < p && get(H, i, p) !== 0)) {
      // Smallest non-zero entry becomes the pivot...
      const best = rows
        .filter((i) => get(H, i, p) !== 0)
        .reduce((a, b) =>
          Math.abs(get(H, b, p)) < Math.abs(get(H, a, p)) ? b : a,
        );
      if (best !== p) H = swapRows(H, best, p);
      // ...and the rows above keep only their remainder.
      for (const i of rows.slice(0, p)) {
        const k = Math.trunc(get(H, i, p) / get(H, p, p));
        if (k !== 0) H = addScaledRow(H, i, p, -k);
      }
    }
    // 2. Positive pivot.
    if (get(H, p, p) < 0) H = negateRow(H, p);
  }

  // 3. Reduce off-diagonals modulo their column's pivot: e mod c first
  //    (it also shifts d), then d and b mod a.
  for (const [i, col] of [
    [2, 1],
    [2, 0],
    [1, 0],
  ] as const) {
    const k = Math.floor(get(H, i, col) / get(H, col, col));
    if (k !== 0) H = addScaledRow(H, i, col, -k);
  }
  return H;
}

/**
 * Every superlattice of index n of a 3D lattice, as Hermite normal forms
 * (see {@link hermiteNormalForm}). There are 1, 7, 13, 35, 31, 91, ... of
 * them for n = 1, 2, 3, 4, 5, 6, ... (OEIS A001001).
 *
 * @param n - Index (supercell volume in parent cells), n >= 1.
 * @returns All distinct HNF matrices with determinant n.
 */
export function hermiteNormalForms(n: number): Matrix[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("hermiteNormalForms: n must be a positive integer");
  }
  const out: Matrix[] = [];
  for (let a = 1; a <= n; a++) {
    if (n % a) continue;
    for (let c = 1; c <= n / a; c++) {
      if ((n / a) % c) continue;
      const f = n / a / c;
      for (let b = 0; b < a; b++)
        for (let d = 0; d < a; d++)
          for (let e = 0; e < c; e++)
            out.push(createMatrix(3, 3, [a, 0, 0, b, c, 0, d, e, f]));
    }
  }
  return out;
}
