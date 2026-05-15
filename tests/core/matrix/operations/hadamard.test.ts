import { describe, expect, it } from "vitest";

import { createMatrix } from "../../../../lib/core/matrix/matrix";
import { hadamard } from "../../../../lib/core/matrix/operations/hadamard";

describe("hadamard", () => {
  it("multiplies element-wise for square matrices", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    const r = hadamard(a, b);

    expect(Array.from(r.data)).toEqual([5, 12, 21, 32]);
  });

  it("works for rectangular matrices", () => {
    const a = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const b = createMatrix(2, 3, [6, 5, 4, 3, 2, 1]);

    const r = hadamard(a, b);

    expect(Array.from(r.data)).toEqual([6, 10, 12, 12, 10, 6]);
  });

  it("handles negative values", () => {
    const a = createMatrix(2, 2, [-1, 2, -3, 4]);

    const b = createMatrix(2, 2, [5, -6, -7, 8]);

    const r = hadamard(a, b);

    expect(Array.from(r.data)).toEqual([-5, -12, 21, 32]);
  });

  it("handles zeros correctly", () => {
    const a = createMatrix(2, 2, [0, 2, 3, 0]);

    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    const r = hadamard(a, b);

    expect(Array.from(r.data)).toEqual([0, 12, 21, 0]);
  });

  it("does not mutate inputs", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);
    const b = createMatrix(2, 2, [5, 6, 7, 8]);

    hadamard(a, b);

    expect(Array.from(a.data)).toEqual([1, 2, 3, 4]);
    expect(Array.from(b.data)).toEqual([5, 6, 7, 8]);
  });

  it("throws on shape mismatch (rows)", () => {
    const a = createMatrix(2, 2);
    const b = createMatrix(3, 2);

    expect(() => hadamard(a, b)).toThrow();
  });

  it("throws on shape mismatch (cols)", () => {
    const a = createMatrix(2, 2);
    const b = createMatrix(2, 3);

    expect(() => hadamard(a, b)).toThrow();
  });

  it("returns correct shape", () => {
    const a = createMatrix(3, 4);
    const b = createMatrix(3, 4);

    const r = hadamard(a, b);

    expect(r.rows).toBe(3);
    expect(r.cols).toBe(4);
  });

  it("handles 1x1 matrices", () => {
    const a = createMatrix(1, 1, [7]);
    const b = createMatrix(1, 1, [3]);

    const r = hadamard(a, b);

    expect(Array.from(r.data)).toEqual([21]);
  });
});
