import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { frobeniusNorm } from "@/core/matrix/operations/frobeniusNorm";

describe("frobeniusNorm", () => {
  it("computes norm of a 2x2 matrix", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    const result = frobeniusNorm(m);

    expect(result).toBeCloseTo(Math.sqrt(30));
  });

  it("returns 0 for zero matrix", () => {
    const m = createMatrix(3, 3);

    expect(frobeniusNorm(m)).toBe(0);
  });

  it("works for rectangular matrices", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const result = frobeniusNorm(m);

    expect(result).toBeCloseTo(Math.sqrt(91));
  });

  it("handles negative values correctly", () => {
    const m = createMatrix(2, 2, [-1, -2, -3, -4]);

    const result = frobeniusNorm(m);

    expect(result).toBeCloseTo(Math.sqrt(30));
  });

  it("is invariant to sign flips per entry", () => {
    const a = createMatrix(2, 2, [1, -2, 3, -4]);
    const b = createMatrix(2, 2, [-1, 2, -3, 4]);

    expect(frobeniusNorm(a)).toBeCloseTo(frobeniusNorm(b));
  });

  it("handles 1x1 matrix", () => {
    const m = createMatrix(1, 1, [5]);

    expect(frobeniusNorm(m)).toBe(5);
  });
});
