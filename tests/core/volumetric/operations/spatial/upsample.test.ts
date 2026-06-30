import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { upsample } from "@/core/volumetric/operations/spatial/upsample";

describe("upsample", () => {
  it("increases shape by integer factor", () => {
    const v = createVolumetricData({
      shape: [2, 2, 2],
      channels: 1,
      data: new Float64Array(8).fill(1),
    });

    const v2 = upsample(v, 2);

    expect(v2.shape).toEqual([4, 4, 4]);
  });

  it("supports anisotropic scaling", () => {
    const v = createVolumetricData({
      shape: [2, 2, 2],
      channels: 1,
      data: new Float64Array(8).fill(1),
    });

    const v2 = upsample(v, [2, 1, 3]);

    expect(v2.shape).toEqual([4, 2, 6]);
  });

  it("does not mutate original volume", () => {
    const v = createVolumetricData({
      shape: [2, 2, 2],
      channels: 1,
      data: new Float64Array(8).fill(1),
    });

    upsample(v, 2);

    expect(v.shape).toEqual([2, 2, 2]);
  });
});
