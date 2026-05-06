import { lll } from "../../../lib/symmetry/reduction/lll";

const det3 = (m: number[][]) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

const norm = (v: number[]) => Math.hypot(...v);

const dot = (a: number[], b: number[]) =>
  a.reduce((s, v, i) => s + v * b[i], 0);

describe("LLL correctness (strong checks)", () => {
  test("Lovász condition holds on output", () => {
    const A = [
      [2, 3, 5],
      [1, 2, 3],
      [3, 2, 1],
    ];

    const { lll_matrix } = lll(A);

    const delta = 0.75;

    const b = lll_matrix.map((_, i) => lll_matrix.map((r) => r[i])); // columns

    for (let k = 1; k < 3; k++) {
      const mu = dot(b[k], b[k - 1]) / dot(b[k - 1], b[k - 1]);

      const lhs = dot(b[k], b[k]);
      const rhs = (delta - mu * mu) * dot(b[k - 1], b[k - 1]);

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

    const cols = lll_matrix.map((_, i) => lll_matrix.map((r) => r[i]));

    const cos = (a: number[], b: number[]) =>
      Math.abs(dot(a, b)) / (norm(a) * norm(b));

    const original = A.map((_, i) => A.map((r) => r[i]));

    const before = cos(original[0], original[1]);
    const after = cos(cols[0], cols[1]);

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
