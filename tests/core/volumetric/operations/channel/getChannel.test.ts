import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { getChannel } from "@/core/volumetric/operations/channel/getChannel";

describe("getChannel", () => {
  it("extracts a single channel as a flat array", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 2,
      data: [1, 10, 2, 20, 3, 30, 4, 40],
    });

    const c0 = getChannel(v, 0);
    const c1 = getChannel(v, 1);

    expect(c0).toEqual([1, 2, 3, 4]);
    expect(c1).toEqual([10, 20, 30, 40]);
  });

  it("returns empty array for empty volume", () => {
    const v = createVolumetricData({
      shape: [0, 0, 0],
      channels: 2,
      data: [],
    });

    expect(getChannel(v, 0)).toEqual([]);
  });
});
