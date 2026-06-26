import { describe, expect, it } from "vitest";

import { fromFunction } from "@/core/volumetric/create/fromFunction";

describe("fromFunction", () => {
  it("evaluates voxel function deterministically", () => {
    const v = fromFunction([2, 2, 2], (x, y, z) => x + y + z);

    expect(v.data.length).toBe(8);
    expect(v.data[0]).toBe(0); // (0,0,0)
  });

  it("supports channels", () => {
    const v = fromFunction([1, 1, 1], (_x, _y, _z, c) => c + 1, 3);

    expect(Array.from(v.data)).toEqual([1, 2, 3]);
  });
});
