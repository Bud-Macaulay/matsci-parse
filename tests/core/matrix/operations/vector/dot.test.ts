import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { dot } from "@/core/matrix/operations/vector/dot";

describe("dot", () => {
  it("computes dot product of 2D vectors", () => {
    const a = createMatrix(2, 1, [1, 2]);
    const b = createMatrix(2, 1, [3, 4]);

    expect(dot(a, b)).toBe(11);
  });

  it("computes dot product of 3D vectors", () => {
    const a = createMatrix(3, 1, [1, 2, 3]);
    const b = createMatrix(3, 1, [4, 5, 6]);

    expect(dot(a, b)).toBe(32);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = createMatrix(2, 1, [1, 0]);
    const b = createMatrix(2, 1, [0, 5]);

    expect(dot(a, b)).toBe(0);
  });

  it("handles negative values", () => {
    const a = createMatrix(2, 1, [-1, 2]);
    const b = createMatrix(2, 1, [3, -4]);

    expect(dot(a, b)).toBe(-11);
  });

  it("throws on mismatched sizes", () => {
    const a = createMatrix(2, 1, [1, 2]);
    const b = createMatrix(3, 1, [1, 2, 3]);

    expect(() => dot(a, b)).toThrow();
  });

  it("works for 1D vectors", () => {
    const a = createMatrix(1, 1, [5]);
    const b = createMatrix(1, 1, [7]);

    expect(dot(a, b)).toBe(35);
  });
});
