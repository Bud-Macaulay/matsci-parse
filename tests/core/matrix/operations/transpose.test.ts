import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { transpose } from "@/core/matrix/operations/transpose";

describe("transpose", () => {
  it("transposes a 2x2 matrix", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    const result = transpose(a);

    expect(Array.from(result.data)).toEqual([1, 3, 2, 4]);
  });

  it("transposes a rectangular matrix (2x3)", () => {
    const a = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const result = transpose(a);

    expect(result.rows).toBe(3);
    expect(result.cols).toBe(2);

    expect(Array.from(result.data)).toEqual([1, 4, 2, 5, 3, 6]);
  });

  it("transposes a 3x3 matrix", () => {
    const a = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const result = transpose(a);

    expect(Array.from(result.data)).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
  });

  it("transposing twice returns original matrix", () => {
    const a = createMatrix(3, 2, [1, 2, 3, 4, 5, 6]);

    const t1 = transpose(a);
    const t2 = transpose(t1);

    expect(t2.rows).toBe(a.rows);
    expect(t2.cols).toBe(a.cols);
    expect(Array.from(t2.data)).toEqual(Array.from(a.data));
  });

  it("does not mutate original matrix", () => {
    const a = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    const original = Array.from(a.data);

    transpose(a);

    expect(Array.from(a.data)).toEqual(original);
  });

  it("handles 1x1 matrix", () => {
    const a = createMatrix(1, 1, [42]);

    const result = transpose(a);

    expect(Array.from(result.data)).toEqual([42]);
    expect(result.rows).toBe(1);
    expect(result.cols).toBe(1);
  });

  it("preserves all values exactly", () => {
    const a = createMatrix(2, 2, [-1, 2, 3.5, -4.25]);

    const result = transpose(a);

    expect(Array.from(result.data)).toEqual([-1, 3.5, 2, -4.25]);
  });
});
