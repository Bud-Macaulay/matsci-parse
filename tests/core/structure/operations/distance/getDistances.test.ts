import { describe, it, expect } from "vitest";
import { getDistances } from "@/core/structure/operations/distance/getDistances";
import { getDistance } from "@/core/structure/operations/distance/getDistance";
import { createLattice } from "@/core/lattice/lattice";

describe("getDistances", () => {
  const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  const s = {
    lattice,
    sites: [
      { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.5, 0, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.5, 0.5, 0]) },
    ],
  };

  it("returns full vector including self-distance", () => {
    const d = getDistances(s, 0);

    expect(d.length).toBe(3);
    expect(d[0]).toBeCloseTo(0);
  });

  it("matches pairwise distances", () => {
    const d = getDistances(s, 0);

    for (let i = 0; i < s.sites.length; i++) {
      expect(d[i]).toBeCloseTo(getDistance(s, 0, i));
    }
  });

  it("is symmetric at vector level", () => {
    const d0 = getDistances(s, 0);
    const d1 = getDistances(s, 1);

    expect(d0[1]).toBeCloseTo(d1[0]);
  });
});
