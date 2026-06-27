import { describe, expect, it } from "vitest";

import { map } from "@/core/volumetric/operations/elementwise/map";
import { ones } from "@/core/volumetric/create/ones";

describe("map", () => {
  it("applies a function to all values", () => {
    const v = ones([2, 2, 1]);

    const out = map(v, (value) => value * 2);

    expect(Array.from(out.data)).toEqual([2, 2, 2, 2]);
  });

  it("preserves shape and channels", () => {
    const v = ones([1, 1, 1], 3);

    const out = map(v, (v) => v + 1);

    expect(out.shape).toEqual([1, 1, 1]);
    expect(out.channels).toBe(3);
  });

  it("passes coordinates correctly", () => {
    const v = ones([1, 1, 2]);

    const out = map(v, (_, x, y, z, c) => x + y + z + c);

    expect(Array.from(out.data)).toEqual([0, 1]);
  });
});
