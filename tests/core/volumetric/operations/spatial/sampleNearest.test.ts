import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { sampleNearest } from "@/core/volumetric/operations/spatial/sampleNearest";

describe("sampleNearest", () => {
  it("returns exact voxel at integer coordinates", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 1,
      data: [1, 2, 3, 4],
    });

    const value = sampleNearest(v, 0, 0, 0);

    expect(value).toEqual([1]);
  });

  it("rounds coordinates to nearest voxel", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      channels: 1,
      data: [0, 10],
    });

    const v1 = sampleNearest(v, 0.1, 0, 0);
    const v2 = sampleNearest(v, 0.9, 0, 0);

    expect(v1).toEqual([0]);
    expect(v2).toEqual([10]);
  });

  it("returns correct channel when specified", () => {
    const v = createVolumetricData({
      shape: [1, 1, 1],
      channels: 2,
      data: [5, 99],
    });

    expect(sampleNearest(v, 0, 0, 0, 0)).toBe(5);
    expect(sampleNearest(v, 0, 0, 0, 1)).toBe(99);
  });

  it("returns NaN out of bounds (vector case)", () => {
    const v = createVolumetricData({
      shape: [1, 1, 1],
      channels: 1,
      data: [1],
    });

    const value = sampleNearest(v, 10, 10, 10);

    expect(Number.isNaN(value[0])).toBe(true);
  });

  it("returns NaN out of bounds (scalar channel case)", () => {
    const v = createVolumetricData({
      shape: [1, 1, 1],
      channels: 1,
      data: [1],
    });

    const value = sampleNearest(v, 10, 10, 10, 0);

    expect(Number.isNaN(value)).toBe(true);
  });
});
