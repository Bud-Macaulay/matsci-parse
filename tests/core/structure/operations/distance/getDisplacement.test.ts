import { describe, it, expect } from "vitest";
import { getDisplacement } from "@/core/structure/operations/distance/getDisplacement";
import { createLattice } from "@/core/lattice/lattice";

function expectVecCloseTo(
  actual: ArrayLike<number>,
  expected: number[],
  digits = 12,
) {
  expect(actual.length).toBe(expected.length);

  for (let i = 0; i < expected.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], digits);
  }
}

describe("getDisplacement", () => {
  const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  it("returns displacement between two sites", () => {
    const s = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0.0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([0.4, 0, 0]) },
      ],
    };

    expectVecCloseTo(getDisplacement(s, 0, 1), [0.4, 0, 0]);
  });

  it("changes sign when indices are reversed", () => {
    const s = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([0.5, 0, 0]) },
      ],
    };

    expectVecCloseTo(getDisplacement(s, 1, 0), [-0.5, 0, 0]);
  });

  it("applies periodic boundary conditions", () => {
    const s = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([0.9, 0, 0]) },
      ],
    };

    expectVecCloseTo(getDisplacement(s, 0, 1), [-0.1, 0, 0]);
  });

  it("applies periodic wrapping independently on all axes", () => {
    const s = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([0.9, 0.9, 0.9]) },
      ],
    };

    expectVecCloseTo(getDisplacement(s, 0, 1), [-0.1, -0.1, -0.1]);
  });

  it("is invariant under full-cell translation", () => {
    const base = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0.2, 0.3, 0.4]) },
        { species: { symbol: "A" }, frac: new Float64Array([0.8, 0.9, 0.1]) },
      ],
    };

    const shifted = {
      lattice,
      sites: base.sites.map((site) => ({
        ...site,
        frac: new Float64Array([
          site.frac[0] + 1,
          site.frac[1] + 1,
          site.frac[2] + 1,
        ]),
      })),
    };

    const d1 = getDisplacement(base, 0, 1);
    const d2 = getDisplacement(shifted, 0, 1);

    expectVecCloseTo(d1, Array.from(d2));
  });

  it("returns zero displacement for identical sites", () => {
    const s = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0.3, 0.4, 0.5]) },
      ],
    };

    expectVecCloseTo(getDisplacement(s, 0, 0), [0, 0, 0]);
  });

  it("wraps values larger than one unit cell", () => {
    const s = {
      lattice,
      sites: [
        { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "A" }, frac: new Float64Array([1.9, 1.9, 1.9]) },
      ],
    };

    expectVecCloseTo(getDisplacement(s, 0, 1), [-0.1, -0.1, -0.1]);
  });
});
