import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { cholesky } from "@/core/matrix/operations/cholesky";
import { mul } from "@/core/matrix/operations/mul";
import { transpose } from "@/core/matrix/operations/transpose";

function expectLLtEqualsA(L: ReturnType<typeof createMatrix>, A: ReturnType<typeof createMatrix>, tol = 10) {
  const n = L.rows;
  const ld = L.data;
  const ad = A.data;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let sum = 0;

      for (let k = 0; k < n; k++) {
        sum += ld[r * n + k] * ld[c * n + k];
      }

      expect(sum).toBeCloseTo(ad[r * n + c], tol);
    }
  }
}

describe("cholesky", () => {
  it("decomposes 2x2 symmetric PD matrix (LLᵀ = A)", () => {
    const A = createMatrix(2, 2, [4, 2, 2, 5]);
    const L = cholesky(A);

    expectLLtEqualsA(L, A);
  });

  it("decomposes 3x3 symmetric PD matrix", () => {
    const A = createMatrix(3, 3, [4, 2, 0, 2, 5, 3, 0, 3, 6]);
    const L = cholesky(A);

    expectLLtEqualsA(L, A);
  });

  it("decomposes 4x4 symmetric PD matrix", () => {
    const A = createMatrix(4, 4, [
      4, 1, 1, 1, 1, 3, 0, 0, 1, 0, 3, 0, 1, 0, 0, 2,
    ]);
    const L = cholesky(A);

    expectLLtEqualsA(L, A);
  });

  it("decomposes identity matrix", () => {
    const I = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const L = cholesky(I);

    expect(Array.from(L.data)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("decomposes diagonal matrix", () => {
    const D = createMatrix(3, 3, [4, 0, 0, 0, 9, 0, 0, 0, 16]);
    const L = cholesky(D);

    expect(L.data[0]).toBeCloseTo(2);
    expect(L.data[4]).toBeCloseTo(3);
    expect(L.data[8]).toBeCloseTo(4);
  });

  it("returns lower triangular matrix", () => {
    const A = createMatrix(3, 3, [4, 2, 0, 2, 5, 3, 0, 3, 6]);
    const L = cholesky(A);

    for (let r = 0; r < 3; r++) {
      for (let c = r + 1; c < 3; c++) {
        expect(L.data[r * 3 + c]).toBe(0);
      }
    }
  });

  it("throws on non-square matrix", () => {
    const A = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);
    expect(() => cholesky(A)).toThrow("square matrix");
  });

  it("throws on non-positive-definite matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 2, 1]);
    expect(() => cholesky(A)).toThrow("not positive definite");
  });

  it("throws on indefinite matrix", () => {
    const A = createMatrix(2, 2, [0, 1, 1, 0]);
    expect(() => cholesky(A)).toThrow("not positive definite");
  });

  it("handles near-singular but PD matrix", () => {
    const A = createMatrix(2, 2, [1, 0.9999, 0.9999, 1]);
    const L = cholesky(A);

    expectLLtEqualsA(L, A, 8);
  });

  it("LLᵀ equals A for larger 6x6 matrix", () => {
    const n = 6;
    // Generate a PD matrix: A = MᵀM + I
    const M = createMatrix(n, n, [
      2, 1, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 2, 1, 0,
      0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 1, 2,
    ]);
    const A = mul(transpose(M), M);

    const L = cholesky(A);
    const LLt = mul(L, transpose(L));

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        expect(LLt.data[r * n + c]).toBeCloseTo(A.data[r * n + c], 10);
      }
    }
  });
});
