import { describe, expect, it } from "vitest";

import { createVolumetricData } from "@/core/volumetric/volumetric";
import { splitChannels } from "@/core/volumetric/operations/channel/splitChannels";
import { mergeChannels } from "@/core/volumetric/operations/channel/mergeChannels";

describe("splitChannels", () => {
  it("splits a multi-channel volume into scalar volumes", () => {
    const v = createVolumetricData({
      shape: [1, 2, 2],
      channels: 2,
      data: [1, 10, 2, 20, 3, 30, 4, 40],
    });

    const [a, b] = splitChannels(v);

    expect(a.channels).toBe(1);
    expect(b.channels).toBe(1);

    expect(Array.from(a.data)).toEqual([1, 2, 3, 4]);
    expect(Array.from(b.data)).toEqual([10, 20, 30, 40]);
  });

  it("returns the original volume when already single-channel", () => {
    const v = createVolumetricData({
      shape: [1, 1, 2],
      data: [1, 2],
    });

    const result = splitChannels(v);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(v);
  });

  it("is the inverse of mergeChannels", () => {
    const a = createVolumetricData({
      shape: [1, 1, 2],
      data: [1, 2],
    });

    const b = createVolumetricData({
      shape: [1, 1, 2],
      data: [10, 20],
    });

    const merged = mergeChannels([a, b]);
    const [aa, bb] = splitChannels(merged);

    expect(Array.from(aa.data)).toEqual(Array.from(a.data));
    expect(Array.from(bb.data)).toEqual(Array.from(b.data));
  });
});
