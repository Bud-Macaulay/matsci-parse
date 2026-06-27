import { describe, expect, it } from "vitest";

import { mul } from "@/core/volumetric/operations/elementwise/mul";
import { fill } from "@/core/volumetric/create/fill";

describe("mul", () => {
  it("multiplies elementwise", () => {
    const a = fill([1, 1, 3], 2);
    const b = fill([1, 1, 3], 2);

    const out = mul(a, b);

    expect(Array.from(out.data)).toEqual([4, 4, 4]);
  });
});
