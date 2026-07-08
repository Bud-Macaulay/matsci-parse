import { describe, expect, it } from "vitest";
import { zeros, ones, random, fromDiagonal } from "@/core/matrix/operations/constructors";

describe("zeros", () => {
  it("creates matrix of zeros", () => {
    const Z = zeros(2, 3);
    expect(Z.rows).toBe(2);
    expect(Z.cols).toBe(3);
    expect(Array.from(Z.data)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("ones", () => {
  it("creates matrix of ones", () => {
    const O = ones(2, 3);
    expect(O.rows).toBe(2);
    expect(O.cols).toBe(3);
    expect(Array.from(O.data)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("creates 1x1 matrix", () => {
    expect(Array.from(ones(1, 1).data)).toEqual([1]);
  });
});

describe("random", () => {
  it("creates matrix with entries in [0, 1)", () => {
    const R = random(10, 10);
    expect(R.rows).toBe(10);
    expect(R.cols).toBe(10);

    for (const v of R.data) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("accepts custom RNG", () => {
    let called = 0;

    const R = random(2, 3, () => {
      called++;
      return 0.5;
    });

    expect(called).toBe(6);
    expect(Array.from(R.data)).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  });

  it("produces different values with Math.random", () => {
    const R = random(5, 5);
    const values = new Set(Array.from(R.data));
    // Very unlikely all 25 values are identical
    expect(values.size).toBeGreaterThan(1);
  });
});

describe("fromDiagonal", () => {
  it("creates diagonal matrix from array", () => {
    const D = fromDiagonal([2, 3, 4]);
    expect(D.rows).toBe(3);
    expect(D.cols).toBe(3);
    expect(Array.from(D.data)).toEqual([2, 0, 0, 0, 3, 0, 0, 0, 4]);
  });

  it("handles single element", () => {
    const D = fromDiagonal([7]);
    expect(Array.from(D.data)).toEqual([7]);
  });

  it("handles empty diagonal", () => {
    const D = fromDiagonal([]);
    expect(D.rows).toBe(0);
    expect(D.cols).toBe(0);
  });

  it("handles negative and zero entries", () => {
    const D = fromDiagonal([-1, 0, 5]);
    expect(D.data[0]).toBe(-1);
    expect(D.data[4]).toBe(0);
    expect(D.data[8]).toBe(5);
  });
});
