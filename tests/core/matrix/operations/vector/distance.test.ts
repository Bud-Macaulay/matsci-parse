import { describe, expect, it } from "vitest";
import { distance } from "@/core/matrix/operations/vector/distance";

describe("distance (vector)", () => {
  it("returns 0 for identical vectors", () => {
    const a = new Float64Array([1, 2, 3]);
    const b = new Float64Array([1, 2, 3]);

    expect(distance(a, b)).toBe(0);
  });

  it("computes Euclidean distance in 2D", () => {
    const a = new Float64Array([0, 0]);
    const b = new Float64Array([3, 4]);

    expect(distance(a, b)).toBe(5);
  });

  it("computes distance with negative values", () => {
    const a = new Float64Array([-1, -1]);
    const b = new Float64Array([2, 3]);

    expect(distance(a, b)).toBeCloseTo(5);
  });

  it("throws on mismatched lengths", () => {
    const a = new Float64Array([1, 2]);
    const b = new Float64Array([1, 2, 3]);

    expect(() => distance(a, b)).toThrow();
  });
});
