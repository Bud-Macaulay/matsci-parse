import { describe, it, expect } from "vitest";

import { fromXYZ, toXYZ } from "@/core/io/xyz";
import { parseStructure } from "@/core/io";
import { MOLECULE_PADDING } from "@/core/io/helpers";
import { cartesian } from "@/core/site";

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

      const text1 = toXYZ(a);

      const b = fromXYZ(text1);

      const text2 = toXYZ(b);

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

describe("XYZ molecule without Lattice", () => {
  // Plain XYZ, as most molecule files are
  const water = `3
water
O 1.0 2.0 3.0
H 1.96 2.0 3.0
H 0.76 2.93 3.0
`;
  const p = MOLECULE_PADDING;

  it("is put in a padded box, as fromPDB without CRYST1", () => {
    const s = fromXYZ(water);

    // The extents 1.2, 0.93 and 0 Å, plus the padding on both sides
    expect(Array.from(s.lattice.basis.data)).toEqual(
      [1.2 + 2 * p, 0, 0, 0, 0.93 + 2 * p, 0, 0, 0, 2 * p].map((x) =>
        expect.closeTo(x, 12),
      ),
    );
  });

  it("says so in moleculeBox, whose origin gives back the file's positions", () => {
    const s = fromXYZ(water);

    expect(s.moleculeBox?.padding).toBe(p);
    const o = s.moleculeBox!.origin;
    const restored = s.sites.map((site) =>
      Array.from(cartesian(s.lattice, site), (x, k) => x + o[k]),
    );
    expect(restored.flat()).toEqual(
      [1.0, 2.0, 3.0, 1.96, 2.0, 3.0, 0.76, 2.93, 3.0].map((x) =>
        expect.closeTo(x, 12),
      ),
    );
  });

  it("is read by parseStructure", () => {
    const { format, structure } = parseStructure(water, {
      fileName: "water.xyz",
    });

    expect(format).toBe("xyz");
    expect(structure.sites.map((x) => x.species.symbol)).toEqual([
      "O",
      "H",
      "H",
    ]);
    expect(structure.moleculeBox).toBeDefined();
  });

  it("is not set for extended XYZ, which has a cell", () => {
    expect(fromXYZ(fixtures.extendedXyz).moleculeBox).toBeUndefined();
  });

  it("still rejects a file without atoms", () => {
    expect(() => fromXYZ("0\nnothing\n")).toThrow();
  });
});
