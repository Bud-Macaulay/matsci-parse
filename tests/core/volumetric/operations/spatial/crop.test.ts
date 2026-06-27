import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { crop } from "@/core/volumetric/operations/spatial/crop";

describe("crop", () => {
  it("extracts subvolume correctly", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 1,
      data: [1, 2, 3, 4],
    });

    const v2 = crop(v, 0, 0, 0, 1, 2, 1);

    expect(Array.from(v2.data)).toEqual([1, 3]);

    expect(v2.shape).toEqual([1, 2, 1]);
  });

  it("preserves immutability", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 1,
      data: [1, 2, 3, 4],
    });

    crop(v, 0, 0, 0, 1, 1, 1);

    expect(Array.from(v.data)).toEqual([1, 2, 3, 4]);
  });
});
