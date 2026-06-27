import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { max } from "@/core/volumetric/operations/reduce/max";

describe("max", () => {
  it("computes the global maximum", () => {
    const v = createVolumetricData({
      shape: [1, 1, 4],
      data: [5, 2, 8, 4],
    });

    expect(max(v)).toBe(8);
  });

  it("computes per-channel maxima", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 2,
      data: [5, 2, 1, 4],
    });

    expect(max(v, { axis: "channels" })).toEqual([5, 4]);
  });
});
