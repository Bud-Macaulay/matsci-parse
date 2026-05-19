import { describe, it, expect } from "vitest";

import { fromStructureData, toStructureData } from "@/core/io/structuredata";

import * as fixtures from "./teststrings/structuredata";

describe("AiiDA StructureData fixtures", () => {
  for (const fixture of Object.values(fixtures)) {
    it(`round-trips ${fixture.name}`, () => {
      const a = fromStructureData(fixture.data);

      const sd1 = toStructureData(a);
      const b = fromStructureData(sd1);

      const sd2 = toStructureData(b);
      const c = fromStructureData(sd2);

      // Structure stability
      expect(c.sites.length).toBe(a.sites.length);

      for (let i = 0; i < a.sites.length; i++) {
        expect(c.sites[i].species.symbol).toBe(a.sites[i].species.symbol);

        for (let j = 0; j < 3; j++) {
          expect(c.sites[i].frac[j]).toBeCloseTo(a.sites[i].frac[j]);
        }
      }

      const aBasis = a.lattice.basis.data;
      const cBasis = c.lattice.basis.data;

      for (let i = 0; i < 9; i++) {
        expect(cBasis[i]).toBeCloseTo(aBasis[i]);
      }

      // StructureData stability
      expect(sd2).toEqual(sd1);
    });
  }
});
