import { describe, it, expect } from "vitest";
import { fromXYZ, toXYZ } from "@/core/io/xyz";
import {
  classicXyz,
  extendedXyz,
  extendedXyzSelective,
  malformedXyz,
} from "./teststrings/xyz";

function expectStructureBasic(structure: any) {
  expect(structure.sites.length).toBe(2);

  expect(structure.sites[0].species.symbol).toBeDefined();
  expect(structure.sites[1].species.symbol).toBeDefined();

  expect(structure.sites[0].frac.length).toBe(3);
  expect(structure.sites[1].frac.length).toBe(3);
}

describe("XYZ IO fixtures", () => {
  it("rejects classic XYZ (no lattice)", () => {
    expect(() => fromXYZ(classicXyz)).toThrow();
  });

  it("rejects classic XYZ (no lattice)", () => {
    expect(() => fromXYZ(malformedXyz)).toThrow();
  });

  it("parses extended XYZ with lattice", () => {
    const s = fromXYZ(extendedXyz);

    console.log(s.lattice, "s");

    expectStructureBasic(s);

    const m = s.lattice.basis.data;

    expect(m[0]).toBeCloseTo(3);
    expect(m[4]).toBeCloseTo(3);
    expect(m[8]).toBeCloseTo(3);
  });

  it("parses selective dynamics XYZ (ignores flags for now)", () => {
    const s = fromXYZ(extendedXyzSelective);

    expectStructureBasic(s);

    // still same structure for now
    expect(s.sites[0].species.symbol).toBe("Na");
    expect(s.sites[1].species.symbol).toBe("Cl");
  });

  it("round-trips extended XYZ consistently over multiple cycles", () => {
    const a = fromXYZ(extendedXyz);

    const b = fromXYZ(toXYZ(a));
    const c = fromXYZ(toXYZ(b));

    expect(b.sites.length).toBe(a.sites.length);
    expect(c.sites.length).toBe(b.sites.length);

    for (let i = 0; i < a.sites.length; i++) {
      expect(c.sites[i].species.symbol).toBe(b.sites[i].species.symbol);

      expect(c.sites[i].frac[0]).toBeCloseTo(b.sites[i].frac[0]);
      expect(c.sites[i].frac[1]).toBeCloseTo(b.sites[i].frac[1]);
      expect(c.sites[i].frac[2]).toBeCloseTo(b.sites[i].frac[2]);
    }
  });

  it("round-trips extended XYZ with other flags", () => {
    const a = fromXYZ(extendedXyzSelective);

    const b = fromXYZ(toXYZ(a));
    const c = fromXYZ(toXYZ(b));

    expect(b.sites.length).toBe(a.sites.length);
    expect(c.sites.length).toBe(b.sites.length);

    for (let i = 0; i < a.sites.length; i++) {
      expect(c.sites[i].species.symbol).toBe(b.sites[i].species.symbol);

      expect(c.sites[i].frac[0]).toBeCloseTo(b.sites[i].frac[0]);
      expect(c.sites[i].frac[1]).toBeCloseTo(b.sites[i].frac[1]);
      expect(c.sites[i].frac[2]).toBeCloseTo(b.sites[i].frac[2]);
    }
  });
});
