import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { norm1, normInf } from "@/core/matrix/operations/norms";

describe("norm1", () => {
  it("computes 1-norm of 2x2 matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 4, 5]);

    // row-major: [[1,2],[4,5]]
    // col 0: |1|+|4| = 5, col 1: |2|+|5| = 7
    expect(norm1(A)).toBe(7);
  });

  it("handles single element", () => {
    const A = createMatrix(1, 1, [-5]);
    expect(norm1(A)).toBe(5);
  });

  it("handles negative values", () => {
    const A = createMatrix(2, 2, [-1, 2, -3, 4]);
    // col 0: 1+3=4, col 1: 2+4=6
    expect(norm1(A)).toBe(6);
  });

  it("returns 0 for zero matrix", () => {
    const A = createMatrix(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(norm1(A)).toBe(0);
  });

  it("handles rectangular matrix", () => {
    const A = createMatrix(2, 3, [1, 3, 5, 2, 4, 6]);
    // col 0: 1+2=3, col 1: 3+4=7, col 2: 5+6=11
    expect(norm1(A)).toBe(11);
  });
});

describe("normInf", () => {
  it("computes infinity-norm of 2x2 matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 4, 5]);
    // row 0: |1|+|2| = 3, row 1: |4|+|5| = 9
    expect(normInf(A)).toBe(9);
  });

  it("handles negative values", () => {
    const A = createMatrix(2, 2, [-1, -2, 3, 4]);
    // row 0: 1+2=3, row 1: 3+4=7
    expect(normInf(A)).toBe(7);
  });

  it("returns 0 for zero matrix", () => {
    const A = createMatrix(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(normInf(A)).toBe(0);
  });

  it("handles rectangular matrix", () => {
    const A = createMatrix(3, 2, [1, 2, 3, 4, 5, 6]);
    // row 0: 1+2=3, row 1: 3+4=7, row 2: 5+6=11
    expect(normInf(A)).toBe(11);
  });

  it("handles single element", () => {
    const A = createMatrix(1, 1, [-5]);
    expect(normInf(A)).toBe(5);
  });
});
