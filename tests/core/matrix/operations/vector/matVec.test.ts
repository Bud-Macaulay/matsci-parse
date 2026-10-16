import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { matVec } from "@/core/matrix/operations/vector/matVec";

describe("matVec", () => {
  it("multiplies a square matrix by a column vector", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    expect(Array.from(matVec(m, [1, 1]))).toEqual([3, 7]);
  });

  it("matches mul with an n×1 matrix", () => {
    const m = createMatrix(2, 3, [1, -2, 0.5, 3, 4, 1]);
    const v = [2, -1, 0.25];

    expect(Array.from(matVec(m, v))).toEqual(
      Array.from(mul(m, createMatrix(3, 1, v)).data),
    );
  });

  it("returns a vector of length m.rows", () => {
    const m = createMatrix(3, 2, [1, 0, 0, 1, 1, 1]);

    expect(matVec(m, new Float64Array([5, 7])).length).toBe(3);
  });

  it("throws on mismatched dimensions", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    expect(() => matVec(m, [1, 2, 3])).toThrow(
      "Invalid matrix-vector multiplication dimensions",
    );
  });
});
