import { describe, it, expect } from "vitest";

import { fromPOSCAR, toPOSCAR } from "@/core/io/poscar";

import * as fixtures from "./teststrings/poscar";
import * as unsupported from "./teststrings/malformed/poscarMalformed";

describe("XYZ invalid fixtures", () => {
  for (const [name, text] of Object.entries(unsupported)) {
    it(`rejects ${name}`, () => {
      expect(() => fromPOSCAR(text)).toThrow();
    });
  }
});

describe("POSCAR round-trip fixtures", () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromPOSCAR(text);

      const text1 = toPOSCAR(a);

      const b = fromPOSCAR(text1);

      const text2 = toPOSCAR(b);

      const c = fromPOSCAR(text2);

      // serializer reaches fixed point
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

describe("selective dynamics", () => {
  it("parses selective dynamics flags", () => {
    const structure = fromPOSCAR(fixtures.selectiveDynamicsPoscar);

    expect(structure.sites[0].properties?.selectiveDynamics).toEqual([
      true,
      true,
      false,
    ]);

    expect(structure.sites[1].properties?.selectiveDynamics).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("preserves selective dynamics through round-trip", () => {
    const a = fromPOSCAR(fixtures.selectiveDynamicsPoscar);
    const text = toPOSCAR(a);
    const b = fromPOSCAR(text);

    for (let i = 0; i < a.sites.length; i++) {
      expect(b.sites[i].properties?.selectiveDynamics).toEqual(
        a.sites[i].properties?.selectiveDynamics,
      );
    }
  });

  it("does not add selective dynamics to non-SD POSCAR", () => {
    const structure = fromPOSCAR(fixtures.simplePoscar);

    for (const site of structure.sites) {
      expect(site.properties?.selectiveDynamics).toBeUndefined();
    }
  });
});
