import { describe, expect, it } from "vitest";
import { angleBetween } from "@/core/matrix/operations/vector/angleBetween";

describe("angleBetween (vector)", () => {
  it("returns 0 for identical vectors", () => {
    const a = new Float64Array([1, 0]);
    const b = new Float64Array([1, 0]);

    expect(angleBetween(a, b)).toBeCloseTo(0);
  });

  it("returns PI/2 for orthogonal vectors", () => {
    const a = new Float64Array([1, 0]);
    const b = new Float64Array([0, 1]);

    expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2);
  });

  it("returns PI for opposite vectors", () => {
    const a = new Float64Array([1, 0]);
    const b = new Float64Array([-1, 0]);

    expect(angleBetween(a, b)).toBeCloseTo(Math.PI);
  });

  it("handles 3D vectors", () => {
    const a = new Float64Array([1, 0, 0]);
    const b = new Float64Array([0, 1, 0]);

    expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2);
  });

  it("throws on zero vector", () => {
    const a = new Float64Array([0, 0, 0]);
    const b = new Float64Array([1, 2, 3]);

    expect(() => angleBetween(a, b)).toThrow();
  });
});
