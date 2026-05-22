import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { sub } from "@/core/matrix/operations/sub";

describe("sub", () => {
  it("subtracts 2x2 matrices", () => {
    const a = createMatrix(2, 2, [5, 6, 7, 8]);

    const b = createMatrix(2, 2, [1, 2, 3, 4]);

    const result = sub(a, b);

    expect(Array.from(result.data)).toEqual([4, 4, 4, 4]);
  });

  it("subtracts rectangular matrices", () => {
    const a = createMatrix(2, 3, [10, 20, 30, 40, 50, 60]);

    const b = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const result = sub(a, b);

    expect(Array.from(result.data)).toEqual([9, 18, 27, 36, 45, 54]);
  });

  it("handles negative results", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    const result = sub(a, b);

    expect(Array.from(result.data)).toEqual([-4, -4, -4, -4]);
  });

  it("handles floating point values", () => {
    const a = createMatrix(2, 2, [5.5, 6.25, 7.75, 8.5]);

    const b = createMatrix(2, 2, [1.5, 2.25, 3.75, 4.5]);

    const result = sub(a, b);

    expect(Array.from(result.data)).toEqual([4, 4, 4, 4]);
  });

  it("subtracts zero matrix correctly", () => {
    const a = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const zero = createMatrix(3, 3);

    const result = sub(a, zero);

    expect(Array.from(result.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("a - a gives zero matrix", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const result = sub(a, a);

    expect(Array.from(result.data)).toEqual([0, 0, 0, 0]);
  });

  it("does not mutate inputs", () => {
    const a = createMatrix(2, 2, [10, 20, 30, 40]);

    const b = createMatrix(2, 2, [1, 2, 3, 4]);

    sub(a, b);

    expect(Array.from(a.data)).toEqual([10, 20, 30, 40]);

    expect(Array.from(b.data)).toEqual([1, 2, 3, 4]);
  });

  it("returns a new matrix instance", () => {
    const a = createMatrix(2, 2);
    const b = createMatrix(2, 2);

    const result = sub(a, b);

    expect(result).not.toBe(a);
    expect(result).not.toBe(b);
    expect(result.data).not.toBe(a.data);
    expect(result.data).not.toBe(b.data);
  });

  it("throws on mismatched row counts", () => {
    const a = createMatrix(2, 2);
    const b = createMatrix(3, 2);

    expect(() => sub(a, b)).toThrow();
  });

  it("throws on mismatched column counts", () => {
    const a = createMatrix(2, 2);
    const b = createMatrix(2, 3);

    expect(() => sub(a, b)).toThrow();
  });

  it("handles large matrices", () => {
    const size = 100;

    const a = createMatrix(size, size, Array(size * size).fill(5));

    const b = createMatrix(size, size, Array(size * size).fill(2));

    const result = sub(a, b);

    expect(result.rows).toBe(size);
    expect(result.cols).toBe(size);

    for (let i = 0; i < result.data.length; i++) {
      expect(result.data[i]).toBe(3);
    }
  });

  it("handles 1x1 matrices", () => {
    const a = createMatrix(1, 1, [10]);
    const b = createMatrix(1, 1, [3]);

    const result = sub(a, b);

    expect(Array.from(result.data)).toEqual([7]);
  });

  it("preserves matrix shape", () => {
    const a = createMatrix(4, 7);
    const b = createMatrix(4, 7);

    const result = sub(a, b);

    expect(result.rows).toBe(4);
    expect(result.cols).toBe(7);
  });
});
