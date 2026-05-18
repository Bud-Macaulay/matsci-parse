import { describe, expect, it } from "vitest";

import { distance } from "@/core/site/distance";
import { createLattice } from "@/core/lattice/lattice";

describe("distance", () => {
  it("computes periodic minimum-image distance", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const d = distance(
      lattice,
      {
        species: { symbol: "Fe" },
        frac: [0.9, 0, 0],
      },
      {
        species: { symbol: "Fe" },
        frac: [0.1, 0, 0],
      },
    );

    expect(d).toBeCloseTo(0.2);
  });
});
