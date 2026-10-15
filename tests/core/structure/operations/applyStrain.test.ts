import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { lengths } from "@/core/lattice/lengths";
import { angles } from "@/core/lattice/angles";
import { volume } from "@/core/lattice/volume";
import { createMatrix } from "@/core/matrix/matrix";
import { cartesian } from "@/core/site/cartesian";
import { createDisorderedSite } from "@/core/site/disorder";
import { applyStrain } from "@/core/structure/operations/applyStrain";
import type { Structure } from "@/core/structure/structure";
import type { DisorderedStructure } from "@/core/structure/disordered";

// Triclinic, so no symmetry hides a wrong transpose.
const structure: Structure = {
  lattice: createLattice([4.1, 0, 0, 0.6, 3.9, 0, -0.4, 0.8, 5.2]),
  sites: [
    { species: { symbol: "Na" }, frac: new Float64Array([0.1, 0.2, 0.3]) },
    { species: { symbol: "Cl" }, frac: new Float64Array([0.6, 0.45, 0.8]) },
  ],
};

const eps = (data: number[]) => createMatrix(3, 3, data);

describe("applyStrain", () => {
  it("uniform strain s scales every length by (1 + s) and keeps angles", () => {
    const out = applyStrain(
      structure,
      eps([0.01, 0, 0, 0, 0.01, 0, 0, 0, 0.01]),
    );
    lengths(out.lattice).forEach((l, i) =>
      expect(l).toBeCloseTo(lengths(structure.lattice)[i]! * 1.01, 12),
    );
    angles(out.lattice).forEach((a, i) =>
      expect(a).toBeCloseTo(angles(structure.lattice)[i]!, 9),
    );
  });

  it("moves atoms with the cell: fractions unchanged, Cartesian r -> (I + ε) r", () => {
    // Not symmetric, so a transposed (I + ε) would fail.
    const e = [0.02, 0.008, -0.01, 0.002, -0.015, 0.006, -0.004, 0.001, 0.01];
    const out = applyStrain(structure, eps(e));
    structure.sites.forEach((site, i) => {
      expect(Array.from(out.sites[i]!.frac)).toEqual(Array.from(site.frac));
      const r = cartesian(structure.lattice, site);
      const moved = cartesian(out.lattice, out.sites[i]!);
      for (let row = 0; row < 3; row++) {
        let expected = r[row]!;
        for (let k = 0; k < 3; k++) expected += e[3 * row + k]! * r[k]!;
        expect(moved[row]).toBeCloseTo(expected, 10);
      }
    });
  });

  it("scales the volume by det(I + ε)", () => {
    const out = applyStrain(
      structure,
      eps([0.03, 0, 0, 0, -0.02, 0, 0, 0, 0.05]),
    );
    expect(volume(out.lattice)).toBeCloseTo(
      volume(structure.lattice) * 1.03 * 0.98 * 1.05,
      10,
    );
  });

  it("a pure shear changes the volume only at second order", () => {
    const g = 0.01;
    const out = applyStrain(structure, eps([0, g, 0, g, 0, 0, 0, 0, 0]));
    // det(I + ε) = 1 - g^2
    expect(volume(out.lattice) / volume(structure.lattice)).toBeCloseTo(
      1 - g * g,
      12,
    );
  });

  it("zero strain returns the same lattice, and the input is not mutated", () => {
    const before = Array.from(structure.lattice.basis.data);
    const out = applyStrain(structure, eps([0, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect(Array.from(out.lattice.basis.data)).toEqual(before);
    expect(Array.from(structure.lattice.basis.data)).toEqual(before);
  });

  it("works on disordered structures and keeps their type", () => {
    const d: DisorderedStructure = {
      disordered: true,
      lattice: createLattice([4, 4, 4]),
      sites: [createDisorderedSite([0, 0, 0], { Ag: 0.5, Pd: 0.5 })],
    };
    const out = applyStrain(d, eps([0.1, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect(out.disordered).toBe(true);
    expect(out.sites).toBe(d.sites);
    expect(lengths(out.lattice)[0]).toBeCloseTo(4.4, 12);
  });

  it("rejects bad strains", () => {
    expect(() =>
      applyStrain(structure, createMatrix(2, 2, [0, 0, 0, 0])),
    ).toThrow(/3x3/);
    expect(() =>
      applyStrain(structure, eps([NaN, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toThrow(/finite/);
    // I + ε singular (-100% along x) or inverted.
    expect(() =>
      applyStrain(structure, eps([-1, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toThrow(/positive/);
    expect(() =>
      applyStrain(structure, eps([-2, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toThrow(/positive/);
  });
});
