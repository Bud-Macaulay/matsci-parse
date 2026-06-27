import { describe, expect, it } from "vitest";

import { sub } from "@/core/volumetric/operations/elementwise/sub";
import { ones } from "@/core/volumetric/create/ones";

describe("sub", () => {
  it("subtracts elementwise", () => {
    const a = ones([1, 1, 2]);
    const b = ones([1, 1, 2]);

    const out = sub(a, b);

    expect(Array.from(out.data)).toEqual([0, 0]);
  });
});
