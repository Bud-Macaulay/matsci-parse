import { describe, it, expect } from "vitest";

import { fromPW, toPW } from "@/core/io/pw";

import * as fixtures from "./teststrings/pw";

describe("PW fixtures", () => {
  for (const [name, pw] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromPW(pw);

      // serializer normalization
      const text1 = toPW(a);

      const b = fromPW(text1);

      const text2 = toPW(b);

      const c = fromPW(text2);

      // serializer reaches fixed point
      expect(text2).toBe(text1);

      // structure preserved
      expect(c.sites.length).toBe(a.sites.length);

      for (let i = 0; i < a.sites.length; i++) {
        expect(c.sites[i].species.symbol).toBe(a.sites[i].species.symbol);

        for (let j = 0; j < 3; j++) {
          expect(c.sites[i].frac[j]).toBeCloseTo(a.sites[i].frac[j]);
        }
      }

      // lattice preserved
      const aBasis = a.lattice.basis.data;
      const cBasis = c.lattice.basis.data;

      for (let i = 0; i < 9; i++) {
        expect(cBasis[i]).toBeCloseTo(aBasis[i]);
      }
    });
  }
});
