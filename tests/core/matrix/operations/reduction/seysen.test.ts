import { describe, it, expect } from "vitest";
import { seysen } from "@/core/matrix/operations/reduction/seysen";
import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { determinant } from "@/core/matrix/operations/determinant";

function approx(a: number, b: number, eps = 1e-6) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

/** Build an n×n Matrix from a flat row-major array. */
function mat(flat: number[], n: number) {
  return createMatrix(n, n, new Float64Array(flat));
}

/** Gram matrix diagonal · its inverse diagonal = Seysen measure S. */
function seysenMeasure(flat: number[]): number {
  const n = Math.round(Math.sqrt(flat.length));
  const B = new Float64Array(flat);
  const G = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += B[i * n + k] * B[j * n + k];
      G[i * n + j] = s;
      G[j * n + i] = s;
    }
  }
  // inverse of G
  const w = 2 * n;
  const aug = new Float64Array(n * w);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) aug[i * w + j] = G[i * n + j];
    aug[i * w + n + i] = 1;
  }
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r * w + col]) > Math.abs(aug[piv * w + col])) piv = r;
    }
    for (let c = 0; c < w; c++) {
      const t = aug[col * w + c];
      aug[col * w + c] = aug[piv * w + c];
      aug[piv * w + c] = t;
    }
    const pv = aug[col * w + col];
    for (let c = 0; c < w; c++) aug[col * w + c] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r * w + col];
      for (let c = 0; c < w; c++) aug[r * w + c] -= f * aug[col * w + c];
    }
  }
  let S = 0;
  for (let i = 0; i < n; i++) S += G[i * n + i] * aug[i * w + n + i];
  return S;
}

describe("seysen", () => {
  it("throws on non-square matrix", () => {
    const m = createMatrix(2, 3, new Float64Array([1, 0, 0, 0, 1, 0]));
    expect(() => seysen(m)).toThrow("square");
  });

  it("throws on singular matrix", () => {
    const m = mat([1, 2, 2, 4], 2);
    expect(() => seysen(m)).toThrow("full-rank");
  });

  it("reduces a 2D basis", () => {
    const m = mat([10, 1, 5, 3], 2);
    const { basis } = seysen(m);
    const n0 = Math.hypot(basis.data[0], basis.data[1]);
    const n1 = Math.hypot(basis.data[2], basis.data[3]);
    expect(Math.min(n0, n1)).toBeLessThan(Math.sqrt(101));
    expect(Math.max(n0, n1)).toBeLessThan(Math.sqrt(101));
  });

  it("transform is unimodular (det = ±1)", () => {
    const m = mat([6, 2, 7, 3], 2);
    const { transform } = seysen(m);
    expect(Math.abs(Math.abs(determinant(transform)) - 1)).toBeLessThan(1e-6);
  });

  it("reduced = transform × original", () => {
    const m = mat([4, 1, 0, 3, 2, 1, 1, 0, 2], 3);
    const { basis, transform } = seysen(m);
    const product = mul(transform, m);
    for (let i = 0; i < 9; i++) approx(product.data[i], basis.data[i]);
  });

  it("preserves the determinant (lattice volume)", () => {
    const m = mat([4, 1, 0, 3, 2, 1, 1, 0, 2], 3);
    const { basis } = seysen(m);
    approx(determinant(basis), determinant(m));
  });

  it("reports the correct measure and it does not increase vs input", () => {
    const m = mat([8, 0, 0, 0, 7, 0, 3, 2, 6], 3);
    const before = seysenMeasure(new Float64Array(m.data));
    const { basis, measure } = seysen(m);
    approx(measure, seysenMeasure(new Float64Array(basis.data)));
    expect(measure).toBeLessThan(before + 1e-9);
  });

  it("achieves measure = n (minimal) on an orthogonal integer basis", () => {
    // Diagonal basis: G[i,i]·H[i,i] = 1 for each i, so S = n.
    const m = mat([2, 0, 0, 0, 3, 0, 0, 0, 4], 3);
    const { measure } = seysen(m);
    approx(measure, 3);
  });

  it("reduces a skew lattice and returns integer basis", () => {
    const m = mat([
      5, 1, 0,
      3, 2, 1,
      0, 4, 3,
    ], 3);
    const { basis, transform } = seysen(m);
    for (let i = 0; i < 9; i++) {
      approx(basis.data[i], Math.round(basis.data[i]), 1e-9);
      approx(transform.data[i], Math.round(transform.data[i]), 1e-9);
    }
  });

  it("4×4 reduction produces a unimodular transform", () => {
    const m = mat([
      2, 1, 0, 0,
      1, 3, 1, 0,
      0, 1, 4, 1,
      0, 0, 1, 5,
    ], 4);
    const { transform, measure } = seysen(m);
    approx(Math.abs(determinant(transform)), 1);
    expect(measure).toBeGreaterThan(4 - 1e-9);
    for (let i = 0; i < 16; i++) {
      approx(transform.data[i], Math.round(transform.data[i]), 1e-9);
    }
  });

  it("handles a 1×1 matrix", () => {
    const m = mat([7], 1);
    const { basis, transform, measure } = seysen(m);
    approx(basis.data[0], 7);
    approx(transform.data[0], 1);
    approx(measure, 1);
  });

  it("negative entries work", () => {
    const m = mat([-3, 2, 1, -4], 2);
    const { basis, transform } = seysen(m);
    const product = mul(transform, m);
    for (let i = 0; i < 4; i++) approx(product.data[i], basis.data[i]);
    expect(Math.abs(Math.abs(determinant(transform)) - 1)).toBeLessThan(1e-6);
  });
});
