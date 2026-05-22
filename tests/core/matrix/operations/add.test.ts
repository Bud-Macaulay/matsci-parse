import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { add } from "@/core/matrix/operations/add";

describe("add", () => {
  it("adds 2x2 matrices", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    const result = add(a, b);

    expect(Array.from(result.data)).toEqual([6, 8, 10, 12]);
  });

  it("adds rectangular matrices", () => {
    const a = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const b = createMatrix(2, 3, [6, 5, 4, 3, 2, 1]);

    const result = add(a, b);

    expect(Array.from(result.data)).toEqual([7, 7, 7, 7, 7, 7]);
  });

  it("adds matrices containing negative values", () => {
    const a = createMatrix(2, 2, [-1, -2, -3, -4]);

    const b = createMatrix(2, 2, [1, 2, 3, 4]);

    const result = add(a, b);

    expect(Array.from(result.data)).toEqual([0, 0, 0, 0]);
  });

  it("adds matrices containing floating point values", () => {
    const a = createMatrix(2, 2, [1.5, 2.25, 3.75, 4.5]);

    const b = createMatrix(2, 2, [0.5, 0.75, 1.25, 1.5]);

    const result = add(a, b);

    expect(Array.from(result.data)).toEqual([2, 3, 5, 6]);
  });

  it("adds zero matrices", () => {
    const a = createMatrix(3, 3);

    const b = createMatrix(3, 3);

    const result = add(a, b);

    expect(Array.from(result.data)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("does not mutate input matrices", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    add(a, b);

    expect(Array.from(a.data)).toEqual([1, 2, 3, 4]);

    expect(Array.from(b.data)).toEqual([5, 6, 7, 8]);
  });

  it("returns a newly allocated matrix", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    const result = add(a, b);

    expect(result).not.toBe(a);
    expect(result).not.toBe(b);

    expect(result.data).not.toBe(a.data);
    expect(result.data).not.toBe(b.data);
  });

  it("throws for mismatched row counts", () => {
    const a = createMatrix(2, 2);

    const b = createMatrix(3, 2);

    expect(() => add(a, b)).toThrow();
  });

  it("throws for mismatched column counts", () => {
    const a = createMatrix(2, 2);

    const b = createMatrix(2, 3);

    expect(() => add(a, b)).toThrow();
  });

  it("handles large matrices", () => {
    const size = 100;

    const a = createMatrix(size, size, Array(size * size).fill(1));

    const b = createMatrix(size, size, Array(size * size).fill(2));

    const result = add(a, b);

    expect(result.rows).toBe(size);
    expect(result.cols).toBe(size);

    for (let i = 0; i < result.data.length; i++) {
      expect(result.data[i]).toBe(3);
    }
  });

  it("handles 1x1 matrices", () => {
    const a = createMatrix(1, 1, [2]);

    const b = createMatrix(1, 1, [3]);

    const result = add(a, b);

    expect(Array.from(result.data)).toEqual([5]);
  });

  it("preserves matrix dimensions", () => {
    const a = createMatrix(4, 7);

    const b = createMatrix(4, 7);

    const result = add(a, b);

    expect(result.rows).toBe(4);
    expect(result.cols).toBe(7);
  });
});
