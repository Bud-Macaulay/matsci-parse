import { describe, expect, it } from "vitest";
import { cross } from "@/core/matrix/operations/vector/cross";

describe("cross (vector)", () => {
  it("computes 3D cross product", () => {
    const a = new Float64Array([1, 0, 0]);
    const b = new Float64Array([0, 1, 0]);

    expect(Array.from(cross(a, b))).toEqual([0, 0, 1]);
  });

  it("returns zero vector for parallel vectors", () => {
    const a = new Float64Array([1, 2, 3]);
    const b = new Float64Array([2, 4, 6]);

    expect(Array.from(cross(a, b))).toEqual([0, 0, 0]);
  });

  it("throws for non-3D vectors", () => {
    const a = new Float64Array([1, 2]);
    const b = new Float64Array([3, 4]);

    expect(() => cross(a, b)).toThrow();
  });
});
