import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { translate } from "@/core/volumetric/operations/spatial/translate";

describe("translate", () => {
  it("shifts volume contents in positive direction", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 1,
      data: [1, 2, 3, 4],
    });

    const v2 = translate(v, 1, 0, 0);

    expect(Array.from(v2.data)).toEqual([0, 1, 0, 3]);
  });

  it("does not mutate original volume", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 1,
      data: [1, 2],
    });

    translate(v, 1, 0, 0);

    expect(Array.from(v.data)).toEqual([1, 2]);
  });
});
