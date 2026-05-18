import { describe, test, expect } from "vitest";
import { lll } from "@/core/matrix/operations/reduction/lll";
import { createMatrix } from "@/core/matrix/matrix";
import { col } from "@/core/matrix/operations/col";

/* ---------------- helpers ---------------- */

const dot = (a: number[], b: number[]) =>
  a.reduce((s, v, i) => s + v * b[i], 0);

const norm = (v: number[]) => Math.hypot(...v);

const det3 = (M: Float64Array | number[]) => {
  const m = Array.from(M);

  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
};

const getCols = (matrix: any) => {
  const cols: number[][] = [];

  for (let i = 0; i < matrix.cols; i++) {
    cols.push(Array.from(col(matrix, i)));
  }

  return cols;
};

/* ---------------- tests ---------------- */

describe("LLL reduction", () => {
  const delta = 0.75;

  test("Lovász condition holds", () => {
    const A = createMatrix(3, 3, [2, 3, 5, 1, 2, 3, 3, 2, 1]);

    const { reduced } = lll(A, delta);

    const b = getCols(reduced);

    for (let k = 1; k < 3; k++) {
      const denom = dot(b[k - 1], b[k - 1]);
      expect(denom).toBeGreaterThan(1e-12);

      const mu = dot(b[k], b[k - 1]) / denom;

      const lhs = dot(b[k], b[k]);
      const rhs = (delta - mu * mu) * denom;

      expect(lhs + 1e-9).toBeGreaterThanOrEqual(rhs);
    }
  });

  test("basis becomes more orthogonal than input", () => {
    const A = createMatrix(3, 3, [10, 9, 8, 9, 8, 7, 8, 7, 6]);

    const before = getCols(A);
    const { reduced } = lll(A);

    const after = getCols(reduced);

    const cos = (a: number[], b: number[]) =>
      Math.abs(dot(a, b)) / (norm(a) * norm(b));

    expect(cos(after[0], after[1])).toBeLessThan(cos(before[0], before[1]));
  });

  test("output remains full rank", () => {
    const A = createMatrix(3, 3, [2, 1, 0, 1, 2, 1, 0, 1, 2]);

    const { reduced } = lll(A);

    expect(Math.abs(det3(reduced.data))).toBeGreaterThan(1e-8);
  });

  test("transformation matrix is near-integer unimodular", () => {
    const A = createMatrix(3, 3, [3, 1, 2, 2, 1, 3, 1, 0, 1]);

    const { transform } = lll(A);

    for (const v of transform.data) {
      expect(Math.abs(v - Math.round(v))).toBeLessThan(1e-8);
    }
  });

  test("fuzz stability (random lattices)", () => {
    for (let i = 0; i < 200; i++) {
      const A = createMatrix(
        3,
        3,
        Array.from({ length: 9 }, () => Math.floor((Math.random() - 0.5) * 20)),
      );

      const { reduced, transform } = lll(A);

      expect(reduced.data.every(Number.isFinite)).toBe(true);
      expect(transform.data.every(Number.isFinite)).toBe(true);

      const norms = getCols(reduced).map(norm);

      expect(Math.min(...norms)).toBeGreaterThan(1e-12);
      expect(Math.max(...norms)).toBeLessThan(1e12);
    }
  });
});
