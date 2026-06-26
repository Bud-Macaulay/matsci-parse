import { describe, expect, it } from "vitest";

import { fromMatrixSlices } from "@/core/volumetric/create/fromMatrixSlices";

describe("fromMatrixSlices", () => {
  it("builds volume from matrix stack", () => {
    const slices = [
      {
        rows: 2,
        cols: 2,
        data: new Float64Array([1, 2, 3, 4]),
      },
      {
        rows: 2,
        cols: 2,
        data: new Float64Array([5, 6, 7, 8]),
      },
    ] as any;

    const v = fromMatrixSlices(slices);

    expect(v.shape).toEqual([2, 2, 2]);
    expect(v.data.length).toBe(8);
  });

  it("throws on inconsistent slice sizes", () => {
    const slices = [
      {
        rows: 2,
        cols: 2,
        data: new Float64Array(4),
      },
      {
        rows: 3,
        cols: 2,
        data: new Float64Array(6),
      },
    ] as any;

    expect(() => fromMatrixSlices(slices)).toThrow();
  });
});
