import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { slice } from "@/core/matrix/operations/slice";

describe("slice", () => {
  const m = createMatrix(3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  it("slices a full-width row block", () => {
    const result = slice(m, 1, 3);

    expect(result.rows).toBe(2);
    expect(result.cols).toBe(4);
    expect(Array.from(result.data)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("defaults rowEnd to the last row", () => {
    expect(Array.from(slice(m, 2).data)).toEqual([9, 10, 11, 12]);
  });

  it("slices an interior block", () => {
    const result = slice(m, 0, 2, 1, 3);

    expect(result.rows).toBe(2);
    expect(result.cols).toBe(2);
    expect(Array.from(result.data)).toEqual([2, 3, 6, 7]);
  });

  it("returns an empty matrix for empty ranges", () => {
    const result = slice(m, 1, 1);

    expect(result.rows).toBe(0);
    expect(result.cols).toBe(4);
    expect(result.data.length).toBe(0);
  });

  it("copies rather than aliasing the input", () => {
    const result = slice(m, 0, 1);
    result.data[0] = 99;

    expect(m.data[0]).toBe(1);
  });

  it("throws on out-of-range bounds", () => {
    expect(() => slice(m, -1, 2)).toThrow("Slice bounds out of range");
    expect(() => slice(m, 0, 4)).toThrow("Slice bounds out of range");
    expect(() => slice(m, 2, 1)).toThrow("Slice bounds out of range");
    expect(() => slice(m, 0, 1, 3, 5)).toThrow("Slice bounds out of range");
  });
});
