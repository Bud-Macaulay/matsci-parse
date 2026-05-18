import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { cross } from "@/core/matrix/operations/vector/cross";

describe("cross", () => {
  it("computes 3D cross product", () => {
    const a = createMatrix(3, 1, [1, 0, 0]);
    const b = createMatrix(3, 1, [0, 1, 0]);

    expect(Array.from(cross(a, b).data)).toEqual([0, 0, 1]);
  });

  it("returns zero vector for parallel vectors", () => {
    const a = createMatrix(3, 1, [1, 2, 3]);
    const b = createMatrix(3, 1, [2, 4, 6]);

    expect(Array.from(cross(a, b).data)).toEqual([0, 0, 0]);
  });

  it("throws for non-3D vectors", () => {
    const a = createMatrix(2, 1, [1, 2]);
    const b = createMatrix(2, 1, [3, 4]);

    expect(() => cross(a, b)).toThrow();
  });
});
