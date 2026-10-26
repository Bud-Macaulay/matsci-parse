import { describe, it, expect } from "vitest";

import { fromXSF, toXSF } from "@/core/io/xsf";

import * as fixtures from "./teststrings/xsf";

describe("XSF round-trip fixtures", () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromXSF(text);

      const text1 = toXSF(a);

      const b = fromXSF(text1);

      const text2 = toXSF(b);

      const c = fromXSF(text2);

      expect(text2).toBe(text1);

      expect(c.sites.length).toBe(a.sites.length);

      for (let i = 0; i < a.sites.length; i++) {
        expect(c.sites[i].species.symbol).toBe(a.sites[i].species.symbol);

        expect(c.sites[i].frac[0]).toBeCloseTo(a.sites[i].frac[0]);

        expect(c.sites[i].frac[1]).toBeCloseTo(a.sites[i].frac[1]);

        expect(c.sites[i].frac[2]).toBeCloseTo(a.sites[i].frac[2]);
      }

      const m1 = a.lattice.basis.data;
      const m2 = c.lattice.basis.data;

      for (let i = 0; i < 9; i++) {
        expect(m2[i]).toBeCloseTo(m1[i]);
      }
    });
  }
});

// Animated-XSF style section headers and atomic numbers, as written by ASE.
// Kept out of the round-trip fixtures: its non-round coordinates do not
// survive the Cartesian -> fractional -> Cartesian conversion bit for bit.
const animatedNumbersXsf = `
CRYSTAL
PRIMVEC 1
      3.1610000000       0.0000000000       0.0000000000
     -1.5805000000       2.7375063014       0.0000000000
      0.0000000000       0.0000000000      12.2950000000
PRIMCOORD 1
2 1
42       0.0000000000       1.8250042009       3.0737500000
16       0.0000000000       1.8250042009       7.7151125000
`;

describe("fromXSF", () => {
  it("reads atomic numbers as element symbols", () => {
    const s = fromXSF(fixtures.XsfNumbers);

    expect(s.sites.map((site) => site.species.symbol)).toEqual(["H", "Li"]);
  });

  it("accepts numbered (animated) section headers", () => {
    const s = fromXSF(animatedNumbersXsf);

    expect(s.sites.map((site) => site.species.symbol)).toEqual(["Mo", "S"]);
    expect(s.lattice.basis.data[3]).toBeCloseTo(-1.5805);
    expect(s.sites[1].frac[2]).toBeCloseTo(7.7151125 / 12.295);
  });

  it("rejects unknown atomic numbers", () => {
    const text = fixtures.XsfNumbers.replace("\n3 1.5", "\n999 1.5");

    expect(() => fromXSF(text)).toThrow("Unknown atomic number 999");
  });
});
