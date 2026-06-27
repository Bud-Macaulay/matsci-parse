import { describe, expect, it } from "vitest";

import { add } from "@/core/volumetric/operations/elementwise/add";
import { ones } from "@/core/volumetric/create/ones";

describe("add", () => {
  it("adds elementwise", () => {
    const a = ones([2, 2, 2]);
    const b = ones([2, 2, 2]);

    const out = add(a, b);

    expect(Array.from(out.data)).toEqual([2, 2, 2, 2, 2, 2, 2, 2]);
  });
});
