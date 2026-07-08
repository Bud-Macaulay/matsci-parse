import { describe, expect, it } from "vitest";

import { mul } from "@/core/volumetric/operations/elementwise/mul";
import { fill } from "@/core/volumetric/create/fill";
import { zeros } from "@/core/volumetric/create/zeros";
import { ones } from "@/core/volumetric/create/ones";
import { createVolumetricData } from "@/core/volumetric/volumetric";

describe("mul", () => {
  it("multiplies elementwise", () => {
    const a = fill([1, 1, 3], 2);
    const b = fill([1, 1, 3], 2);

    const out = mul(a, b);

    expect(Array.from(out.data)).toEqual([4, 4, 4]);
  });

  it("multiplying by zeros yields zeros", () => {
    const a = fill([2, 2, 2], 5);
    const b = zeros([2, 2, 2]);

    const out = mul(a, b);

    expect(Array.from(out.data)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("multiplying by ones yields the original", () => {
    const a = fill([1, 1, 2], 7);
    const b = ones([1, 1, 2]);

    const out = mul(a, b);

    expect(Array.from(out.data)).toEqual([7, 7]);
  });

  it("handles negative values", () => {
    const a = fill([1, 1, 2], 3);
    const b = fill([1, 1, 2], -2);

    const out = mul(a, b);

    expect(Array.from(out.data)).toEqual([-6, -6]);
  });

  it("multiplies multi-channel volumes", () => {
    const a = fill([1, 1, 2], 3, 2);
    const b = fill([1, 1, 2], 4, 2);

    const out = mul(a, b);

    expect(Array.from(out.data)).toEqual([12, 12, 12, 12]);
  });

  it("throws on shape mismatch", () => {
    const a = ones([2, 2, 2]);
    const b = ones([2, 2, 3]);

    expect(() => mul(a, b)).toThrow("shape mismatch");
  });

  it("does not mutate inputs", () => {
    const a = createVolumetricData({ shape: [1, 1, 2], data: [2, 3] });
    const b = createVolumetricData({ shape: [1, 1, 2], data: [4, 5] });

    mul(a, b);

    expect(Array.from(a.data)).toEqual([2, 3]);
    expect(Array.from(b.data)).toEqual([4, 5]);
  });
});
