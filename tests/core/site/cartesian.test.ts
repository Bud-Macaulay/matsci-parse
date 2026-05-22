import { describe, expect, it } from "vitest";
import { cartesian } from "@/core/site/cartesian";
import { createLattice } from "@/core/lattice/lattice";

describe("cartesian", () => {
  it("converts fractional to cartesian", () => {
    const lattice = createLattice([2, 0, 0, 0, 2, 0, 0, 0, 2]);

    const result = cartesian(lattice, {
      species: { symbol: "Fe" },
      frac: [0.5, 0.5, 0.5],
    });

    expect(result).toEqual(new Float64Array([1, 1, 1]));
  });
});
