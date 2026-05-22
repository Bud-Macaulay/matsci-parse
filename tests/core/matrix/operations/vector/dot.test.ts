import { describe, expect, it } from "vitest";
import { dot } from "@/core/matrix/operations/vector/dot";

describe("dot (vector)", () => {
  it("computes dot product in 2D", () => {
    const a = new Float64Array([1, 2]);
    const b = new Float64Array([3, 4]);

    expect(dot(a, b)).toBe(11);
  });

  it("computes dot product in 3D", () => {
    const a = new Float64Array([1, 2, 3]);
    const b = new Float64Array([4, 5, 6]);

    expect(dot(a, b)).toBe(32);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = new Float64Array([1, 0]);
    const b = new Float64Array([0, 5]);

    expect(dot(a, b)).toBe(0);
  });

  it("handles negative values correctly", () => {
    const a = new Float64Array([-1, 2]);
    const b = new Float64Array([3, -4]);

    expect(dot(a, b)).toBe(-11);
  });

  it("works for 1D vectors", () => {
    const a = new Float64Array([5]);
    const b = new Float64Array([7]);

    expect(dot(a, b)).toBe(35);
  });

  it("throws on mismatched lengths", () => {
    const a = new Float64Array([1, 2]);
    const b = new Float64Array([1, 2, 3]);

    expect(() => dot(a, b)).toThrow();
  });
});
