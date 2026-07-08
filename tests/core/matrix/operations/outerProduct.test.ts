import { describe, expect, it } from "vitest";
import { outerProduct } from "@/core/matrix/operations/outerProduct";

describe("outerProduct", () => {
  it("computes 2x3 outer product", () => {
    const u = new Float64Array([1, 2]);
    const v = new Float64Array([3, 4, 5]);
    const result = outerProduct(u, v);

    expect(result.rows).toBe(2);
    expect(result.cols).toBe(3);
    expect(Array.from(result.data)).toEqual([3, 4, 5, 6, 8, 10]);
  });

  it("computes 3x2 outer product", () => {
    const u = new Float64Array([1, 2, 3]);
    const v = new Float64Array([4, 5]);
    const result = outerProduct(u, v);

    expect(result.rows).toBe(3);
    expect(result.cols).toBe(2);
    expect(Array.from(result.data)).toEqual([4, 5, 8, 10, 12, 15]);
  });

  it("returns a rank-1 matrix", () => {
    const u = new Float64Array([1, 2, 3]);
    const v = new Float64Array([4, 5, 6]);
    const result = outerProduct(u, v);

    // All rows should be proportional to v
    for (let r = 1; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(result.data[r * 3 + c]).toBeCloseTo(
          result.data[0 * 3 + c] * (u[r] / u[0]),
        );
      }
    }
  });

  it("handles 1x1 case", () => {
    const u = new Float64Array([3]);
    const v = new Float64Array([4]);
    const result = outerProduct(u, v);

    expect(result.data[0]).toBe(12);
  });

  it("handles negative values", () => {
    const u = new Float64Array([-1, 2]);
    const v = new Float64Array([3, -4]);
    const result = outerProduct(u, v);

    expect(Array.from(result.data)).toEqual([-3, 4, 6, -8]);
  });

  it("handles zero vectors", () => {
    const u = new Float64Array([0, 0]);
    const v = new Float64Array([1, 2, 3]);
    const result = outerProduct(u, v);

    expect(result.data.every((x) => x === 0)).toBe(true);
  });
});
