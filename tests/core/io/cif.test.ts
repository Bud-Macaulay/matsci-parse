import { describe, it, expect } from "vitest";

import { fromCIF, toCIF } from "@/core/io/cif";

import * as cifFixtures from "./teststrings/cif";

describe("CIF fixtures", () => {
  for (const [name, cif] of Object.entries(cifFixtures)) {
    it(`parses ${name}`, () => {
      const s = fromCIF(cif);

      expect(s.lattice).toBeDefined();
      expect(s.sites.length).toBeGreaterThan(0);

      for (const site of s.sites) {
        expect(site.species.symbol).toBeTruthy();

        expect(site.frac.length).toBe(3);

        expect(Number.isFinite(site.frac[0])).toBe(true);
        expect(Number.isFinite(site.frac[1])).toBe(true);
        expect(Number.isFinite(site.frac[2])).toBe(true);
      }
    });

    it(`round-trips ${name}`, () => {
      const a = fromCIF(cif);

      // cycle twice for normalization consistency
      const b = fromCIF(toCIF(a));
      const c = fromCIF(toCIF(b));

      const testCif = toCIF(c);
      console.log(testCif);

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
