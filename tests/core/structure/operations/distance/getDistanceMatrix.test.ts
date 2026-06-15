import { describe, it, expect } from "vitest";
import { getDistancesMatrix } from "@/core/structure/operations/distance/getDistancesMatrix";
import { getDistance } from "@/core/structure/operations/distance/getDistance";
import { createLattice } from "@/core/lattice/lattice";

describe("getDistancesMatrix", () => {
  const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  const s = {
    lattice,
    sites: [
      { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.5, 0, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.5, 0.5, 0]) },
    ],
  };

  it("has correct shape", () => {
    const m = getDistancesMatrix(s);

    expect(m.length).toBe(3);
    expect(m[0].length).toBe(3);
  });

  it("diagonal is zero", () => {
    const m = getDistancesMatrix(s);

    for (let i = 0; i < m.length; i++) {
      expect(m[i][i]).toBeCloseTo(0);
    }
  });

  it("is symmetric", () => {
    const m = getDistancesMatrix(s);

    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m.length; j++) {
        expect(m[i][j]).toBeCloseTo(m[j][i]);
      }
    }
  });

  it("matches getDistance", () => {
    const m = getDistancesMatrix(s);

    for (let i = 0; i < s.sites.length; i++) {
      for (let j = 0; j < s.sites.length; j++) {
        expect(m[i][j]).toBeCloseTo(getDistance(s, i, j));
      }
    }
  });
});
