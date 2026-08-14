import { describe, expect, it } from "vitest";

import { zip } from "@/core/volumetric/operations/elementwise/zip";
import { fill } from "@/core/volumetric/create/fill";
import { ones } from "@/core/volumetric/create/ones";
import { createVolumetricData } from "@/core/volumetric/volumetric";

describe("zip", () => {
  it("combines elementwise with a binary function (fast path)", () => {
    const a = fill([1, 1, 3], 2);
    const b = fill([1, 1, 3], 5);

    const out = zip(a, b, (va, vb) => va + vb);

    expect(Array.from(out.data)).toEqual([7, 7, 7]);
  });

  it("passes coordinates and channel index to the function", () => {
    const a = createVolumetricData({
      shape: [2, 1, 2],
      data: [1, 2, 3, 4],
    });
    const b = zerosLike(a);

    const out = zip(a, b, (va, vb, x, y, z, c, i) => x + y * 10 + z * 100 + c * 1000 + i * 10000);

    expect(Array.from(out.data)).toEqual([0, 10001, 20100, 30101]);
  });

  it("passes the channel index for multi-channel volumes", () => {
    const a = createVolumetricData({
      shape: [1, 1, 2],
      channels: 2,
      data: [1, 2, 3, 4],
    });
    const b = zerosLike(a);

    const out = zip(a, b, (va, vb, x, y, z, c) => c);

    expect(Array.from(out.data)).toEqual([0, 1, 0, 1]);
  });

  it("throws on shape mismatch", () => {
    const a = ones([2, 2, 2]);
    const b = ones([3, 2, 2]);

    expect(() => zip(a, b, (va, vb) => va + vb)).toThrow("shape mismatch");
  });

  it("throws on channel mismatch", () => {
    const a = fill([2, 2, 2], 1, 1);
    const b = fill([2, 2, 2], 1, 2);

    expect(() => zip(a, b, (va, vb) => va + vb)).toThrow("shape mismatch");
  });

  it("does not mutate inputs", () => {
    const a = createVolumetricData({ shape: [1, 1, 2], data: [1, 2] });
    const b = createVolumetricData({ shape: [1, 1, 2], data: [3, 4] });

    zip(a, b, (va, vb) => va + vb);

    expect(Array.from(a.data)).toEqual([1, 2]);
    expect(Array.from(b.data)).toEqual([3, 4]);
  });
});

function zerosLike(a: ReturnType<typeof createVolumetricData>) {
  return createVolumetricData({
    shape: a.shape,
    channels: a.channels,
    data: new Float64Array(a.data.length),
  });
}
