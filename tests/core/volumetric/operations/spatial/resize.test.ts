import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { resize } from "@/core/volumetric/operations/spatial/resize";

describe("resize", () => {
  it("preserves shape change correctly", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 1,
      data: [0, 10],
    });

    const v2 = resize(v, [1, 1, 4]);

    expect(v2.shape).toEqual([1, 1, 4]);
  });

  it("preserves endpoint values (interpolation correctness)", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 1,
      data: [0, 10],
    });

    const v2 = resize(v, [1, 1, 2]);

    expect(Array.from(v2.data)[0]).toBeCloseTo(0);
    expect(Array.from(v2.data)[1]).toBeCloseTo(10);
  });

  it("does not mutate original volume", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 1,
      data: [0, 10],
    });

    resize(v, [1, 1, 4]);

    expect(Array.from(v.data)).toEqual([0, 10]);
  });
});
