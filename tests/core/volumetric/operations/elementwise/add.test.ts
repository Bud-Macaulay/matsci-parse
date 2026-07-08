import { describe, expect, it } from "vitest";

import { add } from "@/core/volumetric/operations/elementwise/add";
import { ones } from "@/core/volumetric/create/ones";
import { zeros } from "@/core/volumetric/create/zeros";
import { fill } from "@/core/volumetric/create/fill";
import { createVolumetricData } from "@/core/volumetric/volumetric";

describe("add", () => {
  it("adds elementwise", () => {
    const a = ones([2, 2, 2]);
    const b = ones([2, 2, 2]);

    const out = add(a, b);

    expect(Array.from(out.data)).toEqual([2, 2, 2, 2, 2, 2, 2, 2]);
  });

  it("adds with zeros (identity)", () => {
    const a = fill([1, 1, 3], 5);
    const b = zeros([1, 1, 3]);

    const out = add(a, b);

    expect(Array.from(out.data)).toEqual([5, 5, 5]);
  });

  it("handles negative values", () => {
    const a = fill([1, 1, 2], 10);
    const b = fill([1, 1, 2], -3);

    const out = add(a, b);

    expect(Array.from(out.data)).toEqual([7, 7]);
  });

  it("adds multi-channel volumes", () => {
    const a = fill([1, 1, 2], 1, 3);
    const b = fill([1, 1, 2], 2, 3);

    const out = add(a, b);

    expect(Array.from(out.data)).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it("throws on shape mismatch", () => {
    const a = ones([2, 2, 2]);
    const b = ones([3, 2, 2]);

    expect(() => add(a, b)).toThrow("shape mismatch");
  });

  it("throws on channel mismatch", () => {
    const a = fill([2, 2, 2], 1, 1);
    const b = fill([2, 2, 2], 1, 2);

    expect(() => add(a, b)).toThrow("shape mismatch");
  });

  it("does not mutate inputs", () => {
    const a = createVolumetricData({ shape: [1, 1, 2], data: [1, 2] });
    const b = createVolumetricData({ shape: [1, 1, 2], data: [3, 4] });

    add(a, b);

    expect(Array.from(a.data)).toEqual([1, 2]);
    expect(Array.from(b.data)).toEqual([3, 4]);
  });
});
