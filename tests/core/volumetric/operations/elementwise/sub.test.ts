import { describe, expect, it } from "vitest";

import { sub } from "@/core/volumetric/operations/elementwise/sub";
import { ones } from "@/core/volumetric/create/ones";
import { fill } from "@/core/volumetric/create/fill";
import { zeros } from "@/core/volumetric/create/zeros";
import { createVolumetricData } from "@/core/volumetric/volumetric";

describe("sub", () => {
  it("subtracts equal volumes to get zeros", () => {
    const a = ones([1, 1, 2]);
    const b = ones([1, 1, 2]);

    const out = sub(a, b);

    expect(Array.from(out.data)).toEqual([0, 0]);
  });

  it("subtracting zero yields the original", () => {
    const a = fill([1, 1, 3], 5);
    const b = zeros([1, 1, 3]);

    const out = sub(a, b);

    expect(Array.from(out.data)).toEqual([5, 5, 5]);
  });

  it("produces negative results", () => {
    const a = fill([1, 1, 2], 3);
    const b = fill([1, 1, 2], 10);

    const out = sub(a, b);

    expect(Array.from(out.data)).toEqual([-7, -7]);
  });

  it("subtracts multi-channel volumes", () => {
    const a = fill([1, 1, 2], 5, 2);
    const b = fill([1, 1, 2], 3, 2);

    const out = sub(a, b);

    expect(Array.from(out.data)).toEqual([2, 2, 2, 2]);
  });

  it("throws on shape mismatch", () => {
    const a = ones([2, 2, 2]);
    const b = ones([2, 1, 2]);

    expect(() => sub(a, b)).toThrow("shape mismatch");
  });

  it("does not mutate inputs", () => {
    const a = createVolumetricData({ shape: [1, 1, 2], data: [5, 6] });
    const b = createVolumetricData({ shape: [1, 1, 2], data: [1, 2] });

    sub(a, b);

    expect(Array.from(a.data)).toEqual([5, 6]);
    expect(Array.from(b.data)).toEqual([1, 2]);
  });
});
