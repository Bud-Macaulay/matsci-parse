import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { pad } from "@/core/volumetric/operations/spatial/pad";

describe("pad", () => {
  it("expands volume with zero padding", () => {
    const v = createVolumetricData({
      shape: [1, 1, 1],
      channels: 1,
      data: [1],
    });

    const v2 = pad(v, 1, 1, 1, 0);

    expect(v2.shape).toEqual([3, 3, 3]);

    const data = Array.from(v2.data);

    // original value should be centered
    const centerIndex = ((1 * 3 + 1) * 3 + 1) * 1;

    expect(data[centerIndex]).toBe(1);
  });

  it("fills non-overwritten regions with fill value", () => {
    const v = createVolumetricData({
      shape: [1, 1, 1],
      channels: 1,
      data: [5],
    });

    const v2 = pad(v, 1, 1, 1, 7);

    const data = Array.from(v2.data);

    // corners should be fill value
    expect(data.filter((x) => x === 7).length).toBeGreaterThan(0);
  });
});
