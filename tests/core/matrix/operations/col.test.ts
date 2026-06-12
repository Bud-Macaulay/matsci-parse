import { describe, expect, it } from "vitest";

import { createMatrix } from "../../../../lib/core/matrix/matrix";
import { col, replaceCol } from "../../../../lib/core/matrix/operations/col";

describe("col", () => {
  it("extracts columns correctly", () => {
    const m = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    expect(Array.from(col(m, 0))).toEqual([1, 4, 7]);
    expect(Array.from(col(m, 1))).toEqual([2, 5, 8]);
    expect(Array.from(col(m, 2))).toEqual([3, 6, 9]);
  });

  it("works for rectangular matrices", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    expect(Array.from(col(m, 0))).toEqual([1, 4]);
    expect(Array.from(col(m, 1))).toEqual([2, 5]);
    expect(Array.from(col(m, 2))).toEqual([3, 6]);
  });

  it("handles Nx1 matrices", () => {
    const m = createMatrix(4, 1, [1, 2, 3, 4]);

    expect(Array.from(col(m, 0))).toEqual([1, 2, 3, 4]);
  });

  it("does not mutate matrix data", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);
    const original = Array.from(m.data);

    col(m, 0);

    expect(Array.from(m.data)).toEqual(original);
  });

  it("returns correct length", () => {
    const m = createMatrix(
      5,
      3,
      Array.from({ length: 15 }, (_, i) => i),
    );

    const c = col(m, 1);

    expect(c.length).toBe(5);
  });

  it("replaces a column correctly (3x3)", () => {
    const m = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const result = replaceCol(m, 1, [10, 11, 12]);

    expect(Array.from(result.data)).toEqual([1, 10, 3, 4, 11, 6, 7, 12, 9]);

    // original unchanged
    expect(Array.from(m.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    expect(result).not.toBe(m);
  });

  it("replaces a column correctly (2x3)", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const result = replaceCol(m, 2, [7, 8]);

    expect(Array.from(result.data)).toEqual([1, 2, 7, 4, 5, 8]);

    expect(Array.from(m.data)).toEqual([1, 2, 3, 4, 5, 6]);

    expect(result).not.toBe(m);
  });

  it("replaces a column correctly (4x1)", () => {
    const m = createMatrix(4, 1, [1, 2, 3, 4]);

    const result = replaceCol(m, 0, [5, 6, 7, 8]);

    expect(Array.from(result.data)).toEqual([5, 6, 7, 8]);

    expect(Array.from(m.data)).toEqual([1, 2, 3, 4]);

    expect(result).not.toBe(m);
  });

  it("does not mutate original matrix", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);
    const original = Array.from(m.data);

    replaceCol(m, 0, [9, 8]);

    expect(Array.from(m.data)).toEqual(original);
  });
});
