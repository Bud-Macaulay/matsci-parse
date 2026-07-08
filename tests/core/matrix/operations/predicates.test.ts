import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import {
  isSquare,
  isSymmetric,
  isDiagonal,
  isIdentity,
} from "@/core/matrix/operations/predicates";

describe("isSquare", () => {
  it("returns true for square matrix", () => {
    expect(isSquare(createMatrix(3, 3))).toBe(true);
  });

  it("returns false for non-square matrix", () => {
    expect(isSquare(createMatrix(2, 3))).toBe(false);
  });

  it("returns true for 1x1", () => {
    expect(isSquare(createMatrix(1, 1))).toBe(true);
  });
});

describe("isSymmetric", () => {
  it("returns true for symmetric matrix", () => {
    const A = createMatrix(3, 3, [1, 2, 3, 2, 4, 5, 3, 5, 6]);
    expect(isSymmetric(A)).toBe(true);
  });

  it("returns false for non-symmetric matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 3, 4]);
    // row-major: [[1,2],[3,4]] → A[0][1]=2, A[1][0]=3, not equal
    expect(isSymmetric(A)).toBe(false);
  });

  it("returns false for non-square matrix", () => {
    expect(isSymmetric(createMatrix(2, 3))).toBe(false);
  });

  it("returns true for identity matrix", () => {
    const A = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(isSymmetric(A)).toBe(true);
  });

  it("handles tiny numerical differences", () => {
    const A = createMatrix(2, 2, [1, 1e-13, 1e-13, 2]);
    expect(isSymmetric(A)).toBe(true);
  });

  it("rejects significant asymmetry", () => {
    const A = createMatrix(2, 2, [1, 1e-10, 1e-10 + 1e-8, 2]);
    expect(isSymmetric(A)).toBe(false);
  });
});

describe("isDiagonal", () => {
  it("returns true for diagonal matrix", () => {
    const A = createMatrix(3, 3, [1, 0, 0, 0, 2, 0, 0, 0, 3]);
    expect(isDiagonal(A)).toBe(true);
  });

  it("returns false for non-diagonal matrix", () => {
    const A = createMatrix(2, 2, [1, 0, 1, 2]);
    expect(isDiagonal(A)).toBe(false);
  });

  it("returns true for rectangular diagonal-possible matrix", () => {
    const A = createMatrix(2, 3, [1, 0, 0, 0, 2, 0]);
    expect(isDiagonal(A)).toBe(true);
  });

  it("returns true for zero matrix", () => {
    const A = createMatrix(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(isDiagonal(A)).toBe(true);
  });
});

describe("isIdentity", () => {
  it("returns true for identity matrix", () => {
    const A = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(isIdentity(A)).toBe(true);
  });

  it("returns false for non-identity diagonal", () => {
    const A = createMatrix(2, 2, [2, 0, 0, 2]);
    expect(isIdentity(A)).toBe(false);
  });

  it("returns false for non-square matrix", () => {
    expect(isIdentity(createMatrix(2, 3))).toBe(false);
  });

  it("handles 1x1", () => {
    expect(isIdentity(createMatrix(1, 1, [1]))).toBe(true);
    expect(isIdentity(createMatrix(1, 1, [2]))).toBe(false);
  });
});
