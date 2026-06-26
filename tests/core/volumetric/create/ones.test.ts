import { describe, expect, it } from "vitest";

import { ones } from "@/core/volumetric/create/ones";

describe("ones", () => {
  it("creates one-filled volume", () => {
    const v = ones([2, 2, 2]);

    expect(Array.from(v.data)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("supports channels", () => {
    const v = ones([1, 1, 1], 2);

    expect(v.channels).toBe(2);
    expect(Array.from(v.data)).toEqual([1, 1]);
  });
});
