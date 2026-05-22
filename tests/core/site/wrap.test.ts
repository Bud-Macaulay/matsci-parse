import { describe, expect, it } from "vitest";
import { wrap } from "@/core/site/wrap";

describe("wrap", () => {
  it("wraps fractional coordinates into [0,1)", () => {
    const wrapped = wrap({
      species: { symbol: "Fe" },
      frac: [1.2, -0.3, 2.7],
    });

    expect(wrapped.frac[0]).toBeCloseTo(0.2);
    expect(wrapped.frac[1]).toBeCloseTo(0.7);
    expect(wrapped.frac[2]).toBeCloseTo(0.7);
  });
});
