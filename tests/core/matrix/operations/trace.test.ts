import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { trace } from "@/core/matrix/operations/trace";

describe("trace", () => {
  it("computes trace of 2x2 matrix", () => {
    const m = createMatrix(2, 2, [1, 2, 3, 4]);

    expect(trace(m)).toBe(5);
  });

  it("computes trace of 3x3 matrix", () => {
    const m = createMatrix(3, 3, [1, 0, 0, 0, 2, 0, 0, 0, 3]);

    expect(trace(m)).toBe(6);
  });

  it("throws on non-square matrix", () => {
    const m = createMatrix(2, 3);

    expect(() => trace(m)).toThrow();
  });
});
