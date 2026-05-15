import { lll } from "../../../lib/symmetry/reduction/lll";

const det3 = (m: number[][]) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

const norm = (v: number[]) => Math.hypot(...v);

const dot = (a: number[], b: number[]) =>
  a.reduce((s, v, i) => s + v * b[i], 0);

const getCols = (m: number[][]) => m[0].map((_, i) => m.map((row) => row[i]));

describe("LLL correctness (strong checks)", () => {
  test("Lovász condition holds on output", () => {
    const A = [
      [2, 3, 5],
      [1, 2, 3],
      [3, 2, 1],
    ];

    const { lll_matrix } = lll(A);

    const delta = 0.75;

    const b = getCols(lll_matrix);

    for (let k = 1; k < 3; k++) {
      const denom = dot(b[k - 1], b[k - 1]);
      expect(denom).toBeGreaterThan(1e-12);

      const mu = dot(b[k], b[k - 1]) / denom;

      const lhs = dot(b[k], b[k]);
      const rhs = (delta - mu * mu) * denom;

      expect(lhs + 1e-9).toBeGreaterThanOrEqual(rhs);
    }
  });

  test("basis vectors are more orthogonal than input", () => {
    const A = [
      [10, 9, 8],
      [9, 8, 7],
      [8, 7, 6],
    ];

    const { lll_matrix } = lll(A);

    const colsReduced = getCols(lll_matrix);
    const colsOriginal = getCols(A);

    const cos = (a: number[], b: number[]) => {
      const na = norm(a);
      const nb = norm(b);
      if (na < 1e-12 || nb < 1e-12) return 0;
      return Math.abs(dot(a, b)) / (na * nb);
    };

    const before = cos(colsOriginal[0], colsOriginal[1]);
    const after = cos(colsReduced[0], colsReduced[1]);

    expect(after).toBeLessThan(before);
  });

  test("output remains full rank", () => {
    const A = [
      [2, 1, 0],
      [1, 2, 1],
      [0, 1, 2],
    ];

    const { lll_matrix } = lll(A);

    expect(Math.abs(det3(lll_matrix))).toBeGreaterThan(1e-8);
  });

  test("transformation is near-integer unimodular", () => {
    const A = [
      [3, 1, 2],
      [2, 1, 3],
      [1, 0, 1],
    ];

    const { transformationMatrix } = lll(A);

    for (const row of transformationMatrix) {
      for (const v of row) {
        expect(Math.abs(v - Math.round(v))).toBeLessThan(1e-8);
      }
    }
  });
});
