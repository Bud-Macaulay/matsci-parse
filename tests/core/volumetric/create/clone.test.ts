import { describe, expect, it } from "vitest";

import { clone } from "@/core/volumetric/create/clone";
import { ones } from "@/core/volumetric/create/ones";

describe("clone", () => {
  it("copies data but keeps same values", () => {
    const v = ones([2, 1, 1]);

    const c = clone(v);

    expect(Array.from(c.data)).toEqual(Array.from(v.data));
  });

  it("does not share underlying buffer", () => {
    const v = ones([2, 1, 1]);

    const c = clone(v);

    c.data[0] = 999;

    expect(v.data[0]).toBe(1);
    expect(c.data[0]).toBe(999);
  });

  it("preserves shape and channels", () => {
    const v = ones([2, 3, 1], 2);

    const c = clone(v);

    expect(c.shape).toEqual(v.shape);
    expect(c.channels).toBe(v.channels);
  });
});
