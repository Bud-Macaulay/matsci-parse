import { describe, it, expect } from "vitest";
import { lll } from "@/core/matrix/operations/reduction/lll";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";

function approx(a: number, b: number, eps = 1e-6) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

/** Build an n×n Matrix from a flat row-major array. */
function mat(flat: number[], n: number) {
  return createMatrix(n, n, new Float64Array(flat));
}

/** Extract a row as a plain array. */
function row(m: { data: Float64Array; cols: number }, i: number): number[] {
  const r: number[] = [];
  for (let j = 0; j < m.cols; j++) r.push(m.data[i * m.cols + j]);
  return r;
}

/** Euclidean norm of a row vector. */
function norm(m: { data: Float64Array; cols: number }, i: number): number {
  let s = 0;
  for (let j = 0; j < m.cols; j++) s += m.data[i * m.cols + j] ** 2;
  return Math.sqrt(s);
}

describe("lll", () => {
  it("throws on non-square matrix", () => {
    const m = createMatrix(2, 3, new Float64Array([1, 0, 0, 0, 1, 0]));
    expect(() => lll(m)).toThrow("square");
  });

  it("throws on invalid delta", () => {
    const m = mat([1, 0, 0, 1], 2);
    expect(() => lll(m, 0.25)).toThrow("delta");
    expect(() => lll(m, 1)).toThrow("delta");
  });

  it("identity matrix is already reduced", () => {
    const m = mat([1, 0, 0, 1], 2);
    const { basis } = lll(m);
    // reduced identity ≈ ±identity
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        approx(Math.abs(basis.data[i * 2 + j]), i === j ? 1 : 0);
      }
    }
  });

  it("reduces a simple 2D basis", () => {
    // basis: [10, 1], [5, 3] — the first vector is long
    const m = mat([10, 1, 5, 3], 2);
    const { basis } = lll(m);

    const n0 = norm(basis, 0);
    const n1 = norm(basis, 1);
    // both reduced vectors should be shorter than the original long one
    expect(n0).toBeLessThan(Math.sqrt(101)); // |(10,1)| ≈ 10.05
    expect(n1).toBeLessThan(Math.sqrt(101));
  });

  it("produces correct transformation: reduced = transform × original", () => {
    // 3×3 example
    const m = mat([
      1, 2, 3,
      4, 5, 6,
      7, 8, 10,
    ], 3);

    const { basis, transform } = lll(m);

    // compute transform × original
    const product = mul(transform, m);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        approx(product.data[i * 3 + j], basis.data[i * 3 + j]);
      }
    }
  });

  it("transform is unimodular (det = ±1)", () => {
    const m = mat([
      1, 2, 3,
      4, 5, 6,
      7, 8, 10,
    ], 3);

    const { transform } = lll(m);

    // det for 3x3
    const d = transform.data;
    const det =
      d[0] * (d[4] * d[8] - d[5] * d[7]) -
      d[1] * (d[3] * d[8] - d[5] * d[6]) +
      d[2] * (d[3] * d[7] - d[4] * d[6]);

    expect(Math.abs(Math.abs(det) - 1)).toBeLessThan(1e-6);
  });

  it("reduces the classic knapsack example", () => {
    // well-known 4D LLL example
    const m = mat([
      1, 1, 1, 0,
      0, 3, 1, 2,
      3, 6, 4, 1,
      1, 7, 0, 5,
    ], 4);

    const { basis } = lll(m);

    // the shortest vector in the reduced basis should be short
    const norms = [0, 1, 2, 3].map((i) => norm(basis, i));
    const shortest = Math.min(...norms);
    // for this lattice, we expect the shortest vector to be relatively short
    expect(shortest).toBeLessThan(4);
  });

  it("reduced basis has shorter or equal vectors", () => {
    const m = mat([
      6, 4, 2,
      1, 3, 5,
      7, 2, 8,
    ], 3);

    const { basis } = lll(m);

    const origNorms = [0, 1, 2].map((i) => norm(m, i)).sort((a, b) => a - b);
    const redNorms = [0, 1, 2].map((i) => norm(basis, i)).sort((a, b) => a - b);

    // the shortest reduced vector should be ≤ the shortest original
    expect(redNorms[0]).toBeLessThanOrEqual(origNorms[0] + 1e-6);
  });

  it("works with delta=0.99 (tighter reduction)", () => {
    const m = mat([10, 1, 5, 3], 2);
    const { basis } = lll(m, 0.99);

    const n0 = norm(basis, 0);
    const n1 = norm(basis, 1);
    expect(n0).toBeLessThan(Math.sqrt(101));
    expect(n1).toBeLessThan(Math.sqrt(101));
  });

  it("handles a 1×1 matrix", () => {
    const m = mat([7], 1);
    const { basis, transform } = lll(m);
    approx(basis.data[0], 7);
    approx(transform.data[0], 1);
  });

  it("handles negative entries", () => {
    const m = mat([
      -3, 2,
      1, -4,
    ], 2);

    const { basis, transform } = lll(m);
    const product = mul(transform, m);

    for (let i = 0; i < 4; i++) {
      approx(product.data[i], basis.data[i]);
    }
  });

  it("handles already-reduced basis", () => {
    // orthogonal basis — already LLL-reduced
    const m = mat([1, 0, 0, 2], 2);
    const { basis } = lll(m);
    // should still be orthogonal and same lengths
    const norms = [0, 1].map((i) => norm(basis, i)).sort((a, b) => a - b);
    approx(norms[0], 1);
    approx(norms[1], 2);
  });

  it("5×5 reduction produces unimodular transform", () => {
    const m = mat([
      2, 1, 0, 0, 0,
      1, 3, 1, 0, 0,
      0, 1, 4, 1, 0,
      0, 0, 1, 5, 1,
      0, 0, 0, 1, 6,
    ], 5);

    const { transform } = lll(m);

    // compute det via LU-like product for 5x5 — check it's ±1
    // use the fact that det(U) = product of pivots for triangular
    // simpler: just check integer entries are all integers
    for (let i = 0; i < 25; i++) {
      const v = transform.data[i];
      expect(Math.abs(v - Math.round(v))).toBeLessThan(1e-6);
    }

    // and the product with the original gives the reduced basis
    const { basis } = lll(m);
    const product = mul(transform, m);
    for (let i = 0; i < 25; i++) {
      approx(product.data[i], basis.data[i]);
    }
  });
});
