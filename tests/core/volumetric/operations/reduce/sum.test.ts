import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { sum } from "@/core/volumetric/operations/reduce/sum";

describe("sum", () => {
  it("computes the total sum", () => {
    const v = createVolumetricData({
      shape: [1, 1, 3],
      data: [1, 2, 3],
    });

    expect(sum(v)).toBe(6);
  });

  it("computes per-channel sums", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 2,
      data: [1, 10, 2, 20],
    });

    expect(sum(v, { axis: "channels" })).toEqual([3, 30]);
  });
});
