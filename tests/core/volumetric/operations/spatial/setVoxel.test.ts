import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { setVoxel } from "@/core/volumetric/operations/spatial/setVoxel";

describe("setVoxel", () => {
  it("updates a voxel immutably", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 2,
      data: [1, 10, 2, 20, 3, 30, 4, 40],
    });

    const v2 = setVoxel(v, 1, 0, 0, [99, 88]);

    expect(v.data).not.toBe(v2.data);

    expect(v2.data).toEqual(new Float64Array([1, 10, 99, 88, 3, 30, 4, 40]));
  });

  it("does not mutate original volume", () => {
    const v = createVolumetricData({
      shape: [1, 1, 1],
      channels: 2,
      data: [1, 2],
    });

    setVoxel(v, 0, 0, 0, [9, 9]);

    expect(v.data).toEqual(new Float64Array([1, 2]));
  });
});
