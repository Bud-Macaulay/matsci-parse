import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { getVoxel } from "@/core/volumetric/operations/spatial/getVoxel";

describe("getVoxel", () => {
  it("returns all channels at a voxel", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 2,
      data: [1, 10, 2, 20, 3, 30, 4, 40],
    });

    expect(getVoxel(v, 0, 0, 0)).toEqual([1, 10]);
    expect(getVoxel(v, 1, 0, 0)).toEqual([2, 20]);
    expect(getVoxel(v, 0, 1, 0)).toEqual([3, 30]);
    expect(getVoxel(v, 1, 1, 0)).toEqual([4, 40]);
  });
});
