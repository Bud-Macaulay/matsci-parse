import { describe, it, expect } from "vitest";

import { fromAims, toAims } from "@/core/io/aims";
import { cartesian } from "@/core/site/cartesian";

import { fe2Aims, naclAims, siFracAims, waterAims } from "./teststrings/aims";

const expectVec = (actual: ArrayLike<number>, expected: number[]) =>
  expected.forEach((v, k) => expect(actual[k]).toBeCloseTo(v, 10));

describe("fromAims", () => {
  it("reads lattice vectors and fractional atoms, ignoring comments", () => {
    const s = fromAims(siFracAims);
    expectVec(s.lattice.basis.data, [0, 2.715, 2.715, 2.715, 0, 2.715, 2.715, 2.715, 0]);
    expect(s.sites.map((x) => x.species.symbol)).toEqual(["Si", "Si"]);
    expectVec(s.sites[1].frac, [0.25, 0.25, 0.25]);
    expect(s.moleculeBox).toBeUndefined();
  });

  it("converts Cartesian atoms to fractional coordinates", () => {
    const s = fromAims(naclAims);
    expectVec(s.sites[1].frac, [0.5, 0.5, 0.5]);
  });

  it("puts a molecule (no lattice vectors) in a padded box", () => {
    const s = fromAims(waterAims);
    expect(s.moleculeBox).toBeDefined();
    const origin = s.moleculeBox!.origin;
    // the file's positions are the structure's plus the box origin
    const h = cartesian(s.lattice, s.sites[1]);
    expectVec([h[0] + origin[0], h[1] + origin[1], h[2] + origin[2]], [0, 0.7572, -0.4692]);
  });

  it("reads initial moments and charges, constraints and species names", () => {
    const s = fromAims(fe2Aims);
    expect(s.sites.map((x) => x.species.symbol)).toEqual(["Fe", "Fe"]);
    expect(s.sites[0].properties).toEqual({
      label: "Fe_up",
      initial_moment: 2,
      selectiveDynamics: [false, false, false],
    });
    expect(s.sites[1].properties).toEqual({
      initial_moment: -2,
      initial_charge: 0.1,
      selectiveDynamics: [true, true, false],
    });
    expect(s.selectiveDynamics).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(() => fromAims("lattice_vector 1 0 0\n")).toThrow(/No atoms/);
    expect(() => fromAims("lattice_vector 1 0 0\natom 0 0 0 H\n")).toThrow(/3 lattice_vector/);
    expect(() => fromAims("atom_frac 0 0 0 H\n")).toThrow(/atom_frac without/);
    expect(() => fromAims("atom 0 0 0 Xq\n")).toThrow(/Unknown element/);
    expect(() => fromAims("atom 0 0 x H\n")).toThrow(/Invalid numbers/);
  });
});

describe("toAims round trip", () => {
  for (const [name, text] of Object.entries({ siFracAims, naclAims, waterAims, fe2Aims })) {
    it(`round-trips ${name}`, () => {
      const a = fromAims(text);
      const written = toAims(a);
      const b = fromAims(written);
      // a molecule's box shift leaves ~1e-15 noise in the written positions
      if (!a.moleculeBox) expect(toAims(b)).toBe(written);
      expect(b.sites.length).toBe(a.sites.length);
      a.sites.forEach((site, i) => {
        expect(b.sites[i].species).toEqual(site.species);
        expect(b.sites[i].properties).toEqual(site.properties);
        expectVec(cartesian(b.lattice, b.sites[i]), Array.from(cartesian(a.lattice, site)));
      });
      expect(Boolean(b.moleculeBox)).toBe(Boolean(a.moleculeBox));
    });
  }

  it("writes a molecule without lattice vectors, at the file's positions", () => {
    const written = toAims(fromAims(waterAims));
    expect(written).not.toMatch(/lattice_vector/);
    const first = written.split("\n")[0].split(/\s+/);
    expectVec(first.slice(1, 4).map(Number), [0, 0, 0.1173]);
  });
});
