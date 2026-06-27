import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { mergeChannels } from "@/core/volumetric/operations/channel/mergeChannels";

describe("mergeChannels", () => {
  it("merges single-channel volumes into a multi-channel volume", () => {
    const a = createVolumetricData({
      shape: [1, 1, 2],
      data: [1, 2],
    });

    const b = createVolumetricData({
      shape: [1, 1, 2],
      data: [10, 20],
    });

    const v = mergeChannels([a, b]);

    expect(v.shape).toEqual([1, 1, 2]);
    expect(v.channels).toBe(2);
    expect(Array.from(v.data)).toEqual([1, 10, 2, 20]);
  });

  it("throws if shapes differ", () => {
    const a = createVolumetricData({
      shape: [1, 1, 2],
      data: [1, 2],
    });

    const b = createVolumetricData({
      shape: [1, 2, 2],
      data: [1, 2, 3, 4],
    });

    expect(() => mergeChannels([a, b])).toThrow();
  });

  it("throws if an input has multiple channels", () => {
    const a = createVolumetricData({
      shape: [1, 1, 1],
      channels: 2,
      data: [1, 2],
    });

    expect(() => mergeChannels([a])).toThrow();
  });
});
