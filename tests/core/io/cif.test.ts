import { describe, it, expect } from "vitest";

import { fromCIF, toCIF } from "@/core/io/cif";

import * as cifFixtures from "./teststrings/cif";

describe("CIF fixtures", () => {
  for (const [name, cif] of Object.entries(cifFixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromCIF(cif);

      const text1 = toCIF(a);

      const b = fromCIF(text1);

      const text2 = toCIF(b);

      const c = fromCIF(text2);

      // serializer reaches fixed point
      expect(text2).toBe(text1);

      expect(c.sites.length).toBe(a.sites.length);

      for (let i = 0; i < a.sites.length; i++) {
        expect(c.sites[i].species.symbol).toBe(a.sites[i].species.symbol);

        expect(c.sites[i].frac[0]).toBeCloseTo(a.sites[i].frac[0]);

        expect(c.sites[i].frac[1]).toBeCloseTo(a.sites[i].frac[1]);

        expect(c.sites[i].frac[2]).toBeCloseTo(a.sites[i].frac[2]);
      }

      const aBasis = a.lattice.basis.data;
      const cBasis = c.lattice.basis.data;

      for (let i = 0; i < 9; i++) {
        expect(cBasis[i]).toBeCloseTo(aBasis[i]);
      }
    });
  }
});
