import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { min } from "@/core/volumetric/operations/reduce/min";

describe("min", () => {
  it("computes the global minimum", () => {
    const v = createVolumetricData({
      shape: [1, 1, 4],
      data: [5, 2, 8, 4],
    });

    expect(min(v)).toBe(2);
  });

  it("computes per-channel minima", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 2,
      data: [5, 2, 1, 4],
    });

    expect(min(v, { axis: "channels" })).toEqual([1, 2]);
  });
});
