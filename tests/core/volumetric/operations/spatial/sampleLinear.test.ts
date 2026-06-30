import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { sampleLinear } from "@/core/volumetric/operations/spatial/sampleLinear";

describe("sampleLinear", () => {
  it("returns exact value at integer coordinates", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 1,
      data: [1, 2, 3, 4],
    });

    const value = sampleLinear(v, 0, 0, 0);

    expect(value).toEqual([1]);
  });

  it("interpolates between voxels", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 1,
      data: [0, 10],
    });

    const value = sampleLinear(v, 0.5, 0, 0);

    expect(value[0]).toBeCloseTo(5);
  });

  it("supports channel access", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 2,
      data: [0, 10, 20, 30],
    });

    const value = sampleLinear(v, 0.5, 0, 0, 1);

    expect(value).toBeCloseTo(20);
  });
});
