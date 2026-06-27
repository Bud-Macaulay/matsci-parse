import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { mean } from "@/core/volumetric/operations/reduce/mean";

describe("mean", () => {
  it("computes the global mean", () => {
    const v = createVolumetricData({
      shape: [1, 1, 4],
      data: [1, 2, 3, 4],
    });

    expect(mean(v)).toBe(2.5);
  });

  it("computes per-channel means", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 2,
      data: [1, 10, 3, 30],
    });

    expect(mean(v, { axis: "channels" })).toEqual([2, 20]);
  });
});
