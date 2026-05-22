import { describe, expect, it } from "vitest";
import { norm } from "@/core/matrix/operations/vector/norm";

describe("norm (vector)", () => {
  it("computes Euclidean norm of 2D vector", () => {
    const v = new Float64Array([3, 4]);

    expect(norm(v)).toBe(5);
  });

  it("computes norm of 3D vector", () => {
    const v = new Float64Array([1, 2, 2]);

    expect(norm(v)).toBe(3);
  });

  it("returns 0 for zero vector", () => {
    const v = new Float64Array([0, 0, 0]);

    expect(norm(v)).toBe(0);
  });

  it("handles negative values correctly", () => {
    const v = new Float64Array([-3, -4]);

    expect(norm(v)).toBe(5);
  });

  it("is invariant to sign flips", () => {
    const a = new Float64Array([1, -2, 3]);
    const b = new Float64Array([-1, 2, -3]);

    expect(norm(a)).toBe(norm(b));
  });

  it("works for 1D vector", () => {
    const v = new Float64Array([7]);

    expect(norm(v)).toBe(7);
  });
});
