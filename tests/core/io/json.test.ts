import { describe, it, expect } from "vitest";

import { toJSON, fromJSON } from "@/core/io/json";
import * as fixtures from "./teststrings/poscar";

import { fromPOSCAR } from "@/core/io/poscar";

describe("JSON structure IO", () => {
  for (const [name, raw] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = typeof raw === "string" ? fromPOSCAR(raw) : raw;

      const j1 = toJSON(a);
      const b = fromJSON(j1);

      const j2 = toJSON(b);
      const c = fromJSON(j2);

      // serializer fixed point
      expect(j2).toEqual(j1);

      // sites preserved
      expect(c.sites.length).toBe(a.sites.length);

      const aSymbols = a.sites.map((s) => s.species.symbol).sort();
      const cSymbols = c.sites.map((s) => s.species.symbol).sort();

      expect(cSymbols).toEqual(aSymbols);

      // fractional coordinates
      for (let i = 0; i < a.sites.length; i++) {
        for (let j = 0; j < 3; j++) {
          expect(c.sites[i].frac[j]).toBeCloseTo(a.sites[i].frac[j]);
        }
      }

      // lattice
      const aBasis = a.lattice.basis.data;
      const cBasis = c.lattice.basis.data;

      for (let i = 0; i < 9; i++) {
        expect(cBasis[i]).toBeCloseTo(aBasis[i]);
      }
    });
  }
});
