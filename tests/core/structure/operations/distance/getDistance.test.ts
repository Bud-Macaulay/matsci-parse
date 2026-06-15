import { describe, it, expect } from "vitest";
import { getDistance } from "@/core/structure/operations/distance/getDistance";
import { createLattice } from "@/core/lattice/lattice";

describe("getDistance", () => {
  const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  const s = {
    lattice,
    sites: [
      { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "A" }, frac: new Float64Array([0.5, 0, 0]) },
    ],
  };

  it("returns 0 for identical sites", () => {
    expect(getDistance(s, 0, 0)).toBeCloseTo(0);
  });

  it("is symmetric", () => {
    expect(getDistance(s, 0, 1)).toBeCloseTo(getDistance(s, 1, 0));
  });

  it("computes correct cubic distance", () => {
    expect(getDistance(s, 0, 1)).toBeCloseTo(0.5);
  });

  it("applies periodic boundary conditions", () => {
    const s2 = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([1, 0, 0]) },
      ],
    };

    expect(getDistance(s2, 0, 1)).toBeCloseTo(0);
  });

  it("across boundary tests", () => {
    const s2 = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([0.8, 0, 0]) },
      ],
    };

    expect(getDistance(s2, 0, 1)).toBeCloseTo(0.2);
  });

  it("across boundary tests diag", () => {
    const s2 = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([0.9, 0.9, 0.9]) },
      ],
    };

    // sqrt (3 * (0.1^2 )) = 0.173205
    expect(getDistance(s2, 0, 1)).toBeCloseTo(0.173205);
  });

  it("across boundary tests diag", () => {
    const s2 = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([1.9, 1.9, 1.9]) },
      ],
    };

    // sqrt (3 * (0.1^2 )) = 0.173205
    expect(getDistance(s2, 0, 1)).toBeCloseTo(0.173205);
  });
});
