import { describe, expect, it } from "vitest";

import { zeros } from "@/core/volumetric/create/zeros";

describe("zeros", () => {
  it("creates zero-filled volume", () => {
    const v = zeros([2, 2, 2]);

    expect(v.shape).toEqual([2, 2, 2]);
    expect(v.channels).toBe(1);
    expect(v.data.length).toBe(8);

    expect(Array.from(v.data)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("supports channels", () => {
    const v = zeros([1, 1, 1], 3);

    expect(v.channels).toBe(3);
    expect(v.data.length).toBe(3);
  });
});
