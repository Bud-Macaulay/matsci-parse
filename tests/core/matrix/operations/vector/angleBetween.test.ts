import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { angleBetween } from "@/core/matrix/operations/vector/angleBetween";

describe("angleBetween", () => {
  it("returns 0 for identical vectors", () => {
    const a = createMatrix(2, 1, [1, 0]);
    const b = createMatrix(2, 1, [1, 0]);

    expect(angleBetween(a, b)).toBeCloseTo(0);
  });

  it("returns PI/2 for orthogonal vectors", () => {
    const a = createMatrix(2, 1, [1, 0]);
    const b = createMatrix(2, 1, [0, 1]);

    expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2);
  });

  it("returns PI for opposite vectors", () => {
    const a = createMatrix(2, 1, [1, 0]);
    const b = createMatrix(2, 1, [-1, 0]);

    expect(angleBetween(a, b)).toBeCloseTo(Math.PI);
  });

  it("handles 3D vectors", () => {
    const a = createMatrix(3, 1, [1, 0, 0]);
    const b = createMatrix(3, 1, [0, 1, 0]);

    expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2);
  });

  it("throws on zero vector", () => {
    const a = createMatrix(3, 1, [0, 0, 0]);
    const b = createMatrix(3, 1, [1, 2, 3]);

    expect(() => angleBetween(a, b)).toThrow();
  });
});
