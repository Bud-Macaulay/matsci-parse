import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { negate } from "@/core/matrix/operations/negate";

describe("negate", () => {
  it("negates matrix values", () => {
    const m = createMatrix(2, 2, [1, -2, 3, -4]);

    const r = negate(m);

    expect(Array.from(r.data)).toEqual([-1, 2, -3, 4]);
  });
});
