import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { distance } from "@/core/matrix/operations/vector/distance";

describe("distance", () => {
  it("computes distance between identical vectors", () => {
    const a = createMatrix(3, 1, [1, 2, 3]);
    const b = createMatrix(3, 1, [1, 2, 3]);

    expect(distance(a, b)).toBe(0);
  });

  it("computes Euclidean distance", () => {
    const a = createMatrix(2, 1, [0, 0]);
    const b = createMatrix(2, 1, [3, 4]);

    expect(distance(a, b)).toBe(5);
  });

  it("handles negative values", () => {
    const a = createMatrix(2, 1, [-1, -1]);
    const b = createMatrix(2, 1, [2, 3]);

    expect(distance(a, b)).toBeCloseTo(5);
  });

  it("throws on mismatched sizes", () => {
    const a = createMatrix(2, 1, [1, 2]);
    const b = createMatrix(3, 1, [1, 2, 3]);

    expect(() => distance(a, b)).toThrow();
  });
});
