import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { vecMul } from "@/core/matrix/operations/vector/vecMul";

describe("vecMul", () => {
  it("multiplies a row vector by a square matrix", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    expect(Array.from(vecMul([1, 1], m))).toEqual([4, 6]);
  });

  it("matches mul with a 1×n matrix", () => {
    const m = createMatrix(3, 2, [1, -2, 0.5, 3, 4, 1]);
    const v = [2, -1, 0.25];

    expect(Array.from(vecMul(v, m))).toEqual(
      Array.from(mul(createMatrix(1, 3, v), m).data),
    );
  });

  it("returns a vector of length m.cols", () => {
    const m = createMatrix(2, 3, [1, 0, 0, 0, 1, 0]);

    expect(vecMul(new Float64Array([5, 7]), m).length).toBe(3);
  });

  it("throws on mismatched dimensions", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    expect(() => vecMul([1, 2, 3], m)).toThrow(
      "Invalid vector-matrix multiplication dimensions",
    );
  });
});
