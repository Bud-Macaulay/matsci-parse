import { describe, it, expect } from "vitest";
import { makeSlab } from "@/core/structure/operations/surface/slab";
import { cubic } from "@/core/lattice/create/cubic";
import { Structure } from "@/core/structure/structure";

function simpleCube(a: number): Structure {
  return {
    lattice: cubic(a),
    sites: [
      { species: { symbol: "A" }, frac: new Float64Array([0, 0, 0]) },
    ],
  };
}

function rockSalt(a: number): Structure {
  return {
    lattice: cubic(a),
    sites: [
      { species: { symbol: "Na" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "Cl" }, frac: new Float64Array([0.5, 0, 0]) },
      { species: { symbol: "Cl" }, frac: new Float64Array([0, 0.5, 0]) },
      { species: { symbol: "Na" }, frac: new Float64Array([0.5, 0.5, 0]) },
      { species: { symbol: "Cl" }, frac: new Float64Array([0, 0, 0.5]) },
      { species: { symbol: "Na" }, frac: new Float64Array([0.5, 0, 0.5]) },
      { species: { symbol: "Na" }, frac: new Float64Array([0, 0.5, 0.5]) },
      { species: { symbol: "Cl" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
    ],
  };
}

function cLength(lattice: { basis: { data: Float64Array } }): number {
  return Math.sqrt(
    lattice.basis.data[6] ** 2 +
      lattice.basis.data[7] ** 2 +
      lattice.basis.data[8] ** 2,
  );
}

describe("makeSlab", () => {
  it("creates a (001) slab from simple cubic", () => {
    const sc = simpleCube(4);
    // supercell is 2×2×2 → 8 atoms.  Thickness = 8 Å includes all atoms.
    const slab = makeSlab(sc, [0, 0, 1], 8, 10);

    expect(slab.sites.length).toBe(8);
    expect(cLength(slab.lattice)).toBeCloseTo(18, 3);
  });

  it("keeps only atoms within the slab thickness", () => {
    const sc = simpleCube(4);
    // supercell z-height is 8 Å; thickness 3.9 Å keeps only bottom half
    const slab = makeSlab(sc, [0, 0, 1], 3.9, 10);
    expect(slab.sites.length).toBe(4);
  });

  it("creates a (001) slab from rock salt", () => {
    const rs = rockSalt(5.64);
    const slab = makeSlab(rs, [0, 0, 1], 11.28, 10);

    expect(slab.sites.length).toBeGreaterThan(0);
    expect(cLength(slab.lattice)).toBeCloseTo(21.28, 1);

    for (const site of slab.sites) {
      const z = site.frac[2];
      expect(z).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThan(1);
    }
  });

  it("creates a (111) slab from simple cubic", () => {
    const sc = simpleCube(3);
    const slab = makeSlab(sc, [1, 1, 1], 5, 10);

    expect(slab.sites.length).toBeGreaterThan(0);

    for (const site of slab.sites) {
      const z = site.frac[2];
      expect(z).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThan(1);
    }
  });

  it("honours the slabShift option", () => {
    const sc = simpleCube(4);
    const slabA = makeSlab(sc, [0, 0, 1], 4, 10, { slabShift: 0 });
    const slabB = makeSlab(sc, [0, 0, 1], 4, 10, { slabShift: 0.2 });

    expect(slabA.sites[0].frac[2]).not.toBeCloseTo(slabB.sites[0].frac[2], 2);
  });

  it("adds vacuum along the surface normal", () => {
    const rs = rockSalt(5.64);
    const slab = makeSlab(rs, [0, 0, 1], 5.64, 15);
    expect(cLength(slab.lattice)).toBeCloseTo(20.64, 1);
  });
});
