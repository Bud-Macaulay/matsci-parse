import { describe, expect, it } from "vitest";
import { cartesian } from "@/core/site/cartesian";
import { fractional } from "@/core/site/fractional";
import { createLattice } from "@/core/lattice/lattice";

describe("coordinate transforms", () => {
  it("converts fractional to cartesian for a skewed lattice", () => {
    const lattice = createLattice([2, 0, 0, 1, 3, 0, 0, 0, 4]);

    const result = cartesian(lattice, {
      species: { symbol: "Fe" },
      frac: [0.5, 0.5, 0.5],
    });

    expect(Array.from(result)).toEqual([1.5, 1.5, 2]);
  });

  it("round-trips fractional -> cartesian -> fractional", () => {
    const lattice = createLattice([2, 0, 0, 1, 3, 0, 0, 0, 4]);

    const frac = new Float64Array([0.123, 0.456, 0.789]);

    const cart = cartesian(lattice, {
      species: { symbol: "Fe" },
      frac,
    });

    const recovered = fractional(lattice, cart);

    expect(recovered[0]).toBeCloseTo(frac[0], 12);
    expect(recovered[1]).toBeCloseTo(frac[1], 12);
    expect(recovered[2]).toBeCloseTo(frac[2], 12);
  });
});
