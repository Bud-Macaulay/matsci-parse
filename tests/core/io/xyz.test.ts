import { describe, it, expect } from "vitest";

import { fromXYZ, toXYZ } from "@/core/io/xyz";

import * as fixtures from "./teststrings/xyz";
import * as unsupported from "./teststrings/malformed/xyzUnsupported";

describe("XYZ invalid fixtures", () => {
  for (const [name, text] of Object.entries(unsupported)) {
    it(`rejects ${name}`, () => {
      expect(() => fromXYZ(text)).toThrow();
    });
  }
});

describe("XYZ round-trip fixtures", () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromXYZ(text);

      console.log(JSON.stringify(a, null, 2));

      const text1 = toXYZ(a);

      const b = fromXYZ(text1);

      const text2 = toXYZ(b);

      console.log(text2);

      const c = fromXYZ(text2);

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
