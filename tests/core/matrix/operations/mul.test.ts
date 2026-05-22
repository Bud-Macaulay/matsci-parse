import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";

describe("mul", () => {
  it("multiplies 2x2 matrices", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    const result = mul(a, b);

    // [ [1*5+2*7, 1*6+2*8],
    //   [3*5+4*7, 3*6+4*8] ]
    expect(Array.from(result.data)).toEqual([19, 22, 43, 50]);
  });

  it("multiplies rectangular matrices (2x3 * 3x2)", () => {
    const a = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const b = createMatrix(3, 2, [7, 8, 9, 10, 11, 12]);

    const result = mul(a, b);

    expect(Array.from(result.data)).toEqual([58, 64, 139, 154]);
  });

  it("multiplies identity matrix correctly (A * I = A)", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const I = createMatrix(2, 2, [1, 0, 0, 1]);

    const result = mul(a, I);

    expect(Array.from(result.data)).toEqual([1, 2, 3, 4]);
  });

  it("multiplies identity on left (I * A = A)", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const I = createMatrix(2, 2, [1, 0, 0, 1]);

    const result = mul(I, a);

    expect(Array.from(result.data)).toEqual([1, 2, 3, 4]);
  });

  it("handles zero matrix multiplication", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const zero = createMatrix(2, 2);

    const result = mul(a, zero);

    expect(Array.from(result.data)).toEqual([0, 0, 0, 0]);
  });

  it("handles negative values", () => {
    const a = createMatrix(2, 2, [-1, 2, -3, 4]);

    const b = createMatrix(2, 2, [5, -6, 7, -8]);

    const result = mul(a, b);

    expect(Array.from(result.data)).toEqual([9, -10, 13, -14]);
  });

  it("does not mutate inputs", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    mul(a, b);

    expect(Array.from(a.data)).toEqual([1, 2, 3, 4]);

    expect(Array.from(b.data)).toEqual([5, 6, 7, 8]);
  });

  it("returns a new matrix instance", () => {
    const a = createMatrix(2, 2);
    const b = createMatrix(2, 2);

    const result = mul(a, b);

    expect(result).not.toBe(a);
    expect(result).not.toBe(b);
    expect(result.data).not.toBe(a.data);
    expect(result.data).not.toBe(b.data);
  });

  it("throws on invalid dimensions (cols != rows)", () => {
    const a = createMatrix(2, 3);
    const b = createMatrix(2, 2);

    expect(() => mul(a, b)).toThrow();
  });

  it("throws on non-conformable matrices", () => {
    const a = createMatrix(3, 4);
    const b = createMatrix(5, 2);

    expect(() => mul(a, b)).toThrow();
  });

  it("handles 1x1 multiplication", () => {
    const a = createMatrix(1, 1, [2]);
    const b = createMatrix(1, 1, [3]);

    const result = mul(a, b);

    expect(Array.from(result.data)).toEqual([6]);
  });

  it("handles larger matrices correctly", () => {
    const a = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const b = createMatrix(3, 3, [9, 8, 7, 6, 5, 4, 3, 2, 1]);

    const result = mul(a, b);

    expect(Array.from(result.data)).toEqual([
      30, 24, 18, 84, 69, 54, 138, 114, 90,
    ]);
  });

  it("handles floating point values", () => {
    const a = createMatrix(2, 2, [1.5, 2.0, 3.0, 4.0]);

    const b = createMatrix(2, 2, [0.5, 1.0, 1.5, 2.0]);

    const result = mul(a, b);

    expect(Array.from(result.data)).toEqual([3.75, 5.5, 7.5, 11]);
  });

  it("preserves output shape", () => {
    const a = createMatrix(2, 3);
    const b = createMatrix(3, 4);

    const result = mul(a, b);

    expect(result.rows).toBe(2);
    expect(result.cols).toBe(4);
  });

  it("stress test: medium random matrices", () => {
    const size = 20;

    const a = createMatrix(size, size, Array(size * size).fill(1));

    const b = createMatrix(size, size, Array(size * size).fill(1));

    const result = mul(a, b);

    // every entry should be size
    for (let i = 0; i < result.data.length; i++) {
      expect(result.data[i]).toBe(size);
    }
  });
});
