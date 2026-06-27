import { describe, expect, it } from "vitest";

import { scale } from "@/core/volumetric/operations/elementwise/scale";
import { ones } from "@/core/volumetric/create/ones";

describe("scale", () => {
  it("multiplies all values", () => {
    const v = ones([2, 2, 2]); /// 2x2x2 grid of 1

    const out = scale(v, 3);

    expect(Array.from(out.data)).toEqual([3, 3, 3, 3, 3, 3, 3, 3]); // should return 2x2x2 grid of 3
  });

  it("works with floats", () => {
    const v = ones([2, 2, 2]); /// 2x2x2 grid of 1

    const out = scale(v, 2.1);

    expect(Array.from(out.data)).toEqual([
      2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1,
    ]); // should return 2x2x2 grid of 2.1
  });

  it("works with floats", () => {
    const v = ones([2, 2, 2]); /// 2x2x2 grid of 1

    const out = scale(v, -1);

    expect(Array.from(out.data)).toEqual([-1, -1, -1, -1, -1, -1, -1, -1]); // should return 2x2x2 grid of -1
  });

  it("works with zero", () => {
    const v = ones([1, 1, 1]);

    const out = scale(v, 0);

    expect(Array.from(out.data)).toEqual([0]);
  });
});
