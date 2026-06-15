import { describe, it, expect } from "vitest";
import { getDistance } from "@/core/structure/operations/distance/getDistance";
import { getDistances } from "@/core/structure/operations/distance/getDistances";
import { getDistancesMatrix } from "@/core/structure/operations/distance/getDistancesMatrix";
import { createLattice } from "@/core/lattice/lattice";

describe("distance consistency", () => {
  const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  const s = {
    lattice,
    sites: [
      { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.5, 0, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.5, 0.5, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.1, 0.2, 0.3]) },
    ],
  };

  it("all representations agree", () => {
    const matrix = getDistancesMatrix(s);

    for (let i = 0; i < s.sites.length; i++) {
      const vec = getDistances(s, i);

      for (let j = 0; j < s.sites.length; j++) {
        expect(getDistance(s, i, j)).toBeCloseTo(matrix[i][j]);
        expect(vec[j]).toBeCloseTo(matrix[i][j]);
      }
    }
  });

  it("symmetry holds globally", () => {
    const m = getDistancesMatrix(s);

    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m.length; j++) {
        expect(m[i][j]).toBeCloseTo(m[j][i]);
      }
    }
  });
});
