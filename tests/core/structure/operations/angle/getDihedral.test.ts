import { describe, it, expect } from "vitest";
import { getDihedral } from "@/core/structure/operations/angle/getDihedral";
import { createLattice } from "@/core/lattice/lattice";

function makeStructure(lattice: any, fracs: number[][]) {
  return {
    lattice,
    sites: fracs.map((f) => ({
      species: { symbol: "A" },
      frac: new Float64Array(f),
    })),
  };
}

describe("getDihedral (including skewed lattice)", () => {
  it("works in orthonormal cubic lattice", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0, 0, 0],
      [0.25, 0, 0],
      [0.5, 0, 0],
      [0.75, 0, 0],
    ]);

    expect(getDihedral(s, 0, 1, 2, 3)).toBeCloseTo(0);
  });

  it("is stable under skewed lattice transformation", () => {
    // skewed cell (non-orthogonal basis)
    const lattice = createLattice([1, 0.2, 0, 0, 1, 0.3, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.4, 0.1, 0.1],
      [0.4, 0.4, 0.1],
      [0.4, 0.4, 0.4],
    ]);

    const angle = getDihedral(s, 0, 1, 2, 3);

    // vesta reports a slightly (86.63) different dihedral...?
    expect(angle).toBeCloseTo(86.71085367, 5);
  });

  it("skewed lattice preserves invariance under site translation", () => {
    const lattice = createLattice([1, 0.3, 0.2, 0, 1, 0.4, 0, 0, 1]);

    const base = makeStructure(lattice, [
      [0.15, 0.2, 0.1],
      [0.55, 0.2, 0.1],
      [0.55, 0.6, 0.1],
      [0.55, 0.6, 0.6],
    ]);

    const shifted = makeStructure(lattice, [
      [1.15, 1.2, 1.1],
      [1.55, 1.2, 1.1],
      [1.55, 1.6, 1.1],
      [1.55, 1.6, 1.6],
    ]);

    const a = getDihedral(base, 0, 1, 2, 3);
    const b = getDihedral(shifted, 0, 1, 2, 3);

    expect(a).toBeCloseTo(b, 6);
  });
});
