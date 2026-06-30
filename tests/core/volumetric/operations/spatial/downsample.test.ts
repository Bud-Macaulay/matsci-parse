import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { downsample } from "@/core/volumetric/operations/spatial/downsample";

describe("downsample", () => {
  it("reduces shape by integer factor", () => {
    const v = createVolumetricData({
      shape: [4, 4, 4],
      channels: 1,
      data: new Float64Array(64).fill(1),
    });

    const v2 = downsample(v, 2);

    expect(v2.shape).toEqual([2, 2, 2]);
  });

  it("supports anisotropic factors", () => {
    const v = createVolumetricData({
      shape: [4, 8, 8],
      channels: 1,
      data: new Float64Array(256).fill(1),
    });

    const v2 = downsample(v, [2, 4, 2]);

    expect(v2.shape).toEqual([2, 2, 4]);
  });

  it("does not mutate original volume", () => {
    const v = createVolumetricData({
      shape: [4, 4, 4],
      channels: 1,
      data: new Float64Array(64).fill(1),
    });

    downsample(v, 2);

    expect(v.shape).toEqual([4, 4, 4]);
  });
});
