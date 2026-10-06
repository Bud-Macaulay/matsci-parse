import { describe, it, expect } from "vitest";
import {
  getNeighbors,
  getCoordinationNumbers,
} from "@/core/structure/operations/neighbors";
import { createLattice } from "@/core/lattice/lattice";

describe("neighbors", () => {
  // CsCl-like cell, a = 4: 8 Cl cube corners around Cs at distance
  // sqrt(3) * 2 ≈ 3.464 < radii sum 2.44 + 1.02 + 0.3 skin = 3.76.
  const s = {
    lattice: createLattice([4, 0, 0, 0, 4, 0, 0, 0, 4]),
    sites: [
      { species: { symbol: "Cs" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "Cl" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
    ],
  };

  it("finds periodic images sorted by distance", () => {
    const n = getNeighbors(s, 0);
    const cl = n.filter((x) => x.symbol === "Cl");

    expect(cl).toHaveLength(8);
    expect(n[0].distance).toBeCloseTo(3.4641, 3);
    expect(new Set(cl.map((x) => x.image.join(","))).size).toBe(8);
  });

  it("finds self-images across the boundary", () => {
    // Single Cs in a = 4 cell: 6 self-images at 4.0 < 5.18 cutoff.
    const single = {
      lattice: s.lattice,
      sites: [{ species: { symbol: "Cs" }, frac: new Float64Array([0, 0, 0]) }],
    };
    const n = getNeighbors(single, 0);

    expect(n).toHaveLength(6);
    expect(n.every((x) => x.index === 0)).toBe(true);
    expect(n[0].distance).toBeCloseTo(4, 6);
  });

  it("honors an explicit cutoff", () => {
    expect(getNeighbors(s, 0, { cutoff: 3 })).toHaveLength(0);
    // 3.6 keeps the 8 Cl corners (3.46) but drops Cs self-images (4.0).
    expect(getCoordinationNumbers(s, { cutoff: 3.6 })).toEqual([8, 8]);
  });

  it("finds images in highly skewed cells", () => {
    // a=(10,0,0), b=(9.95,0.2,0): image (2,-2,0) sits ~0.5 away.
    // Vector-length bounds (ceil(cutoff/10) = 1) would miss it.
    const skew = {
      lattice: createLattice([10, 0, 0, 9.95, 0.2, 0, 0, 0, 5]),
      sites: [
        { species: { symbol: "Cs" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "Cl" }, frac: new Float64Array([0.01, 0.01, 0]) },
      ],
    };
    const n = getNeighbors(skew, 0);
    const far = n
      .filter((x) => x.symbol === "Cl")
      .find((x) => x.image.join(",") === "2,-2,0");

    expect(far).toBeDefined();
    expect(far!.distance).toBeCloseTo(0.498, 2);
  });

  it("skips unknown radii unless cutoff is given", () => {
    const s2 = {
      lattice: s.lattice,
      sites: [
        { species: { symbol: "Bk" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "Cl" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
      ],
    };

    expect(getNeighbors(s2, 0)).toHaveLength(0);
    const cl = getNeighbors(s2, 0, { cutoff: 4 }).filter(
      (x) => x.symbol === "Cl",
    );

    expect(cl).toHaveLength(8);
  });

  it("handles isotope symbols and boundary-equivalent fracs", () => {
    const s3 = {
      lattice: createLattice([10, 0, 0, 0, 10, 0, 0, 0, 10]),
      sites: [
        { species: { symbol: "D" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "D" }, frac: new Float64Array([0.07, 0, 0]) },
      ],
    };
    const n = getNeighbors(s3, 0);

    expect(n).toHaveLength(1);
    expect(n[0].distance).toBeCloseTo(0.7, 6);

    // frac 1.0 == frac 0.0: canonical zero-distance image.
    const s4 = {
      lattice: s3.lattice,
      sites: [
        { species: { symbol: "H" }, frac: new Float64Array([0, 0, 0]) },
        { species: { symbol: "H" }, frac: new Float64Array([1, 0, 0]) },
      ],
    };
    const m = getNeighbors(s4, 0);

    expect(m[0].distance).toBeCloseTo(0, 9);
    expect(m[0].image).toEqual([0, 0, 0]);
  });
});
