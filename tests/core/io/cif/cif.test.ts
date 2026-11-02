import { describe, it, expect } from "vitest";

import { fromCIF, toCIF } from "@/core/io/cif";
import { parseStructure } from "@/core/io";
import { MOLECULE_PADDING } from "@/core/io/helpers";
import { cartesian } from "@/core/site";

import * as cifFixtures from "./teststrings/cif";

const p1Fixtures = Object.fromEntries(
  Object.entries(cifFixtures).filter(
    ([, cif]) => !cif.includes("_symmetry_equiv_pos_as_xyz"),
  ),
);

const symFixtures = Object.fromEntries(
  Object.entries(cifFixtures).filter(([, cif]) =>
    cif.includes("_symmetry_equiv_pos_as_xyz"),
  ),
);

describe("CIF P1 round-trips", () => {
  for (const [name, cif] of Object.entries(p1Fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromCIF(cif);

      const text1 = toCIF(a);

      const b = fromCIF(text1);

      const text2 = toCIF(b);

      const c = fromCIF(text2);

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

describe("CIF molecules (Cartesian positions, no cell)", () => {
  const water = `data_water
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_Cartn_x
_atom_site_Cartn_y
_atom_site_Cartn_z
O1 O 1.0 2.0 3.0
H2 H 1.96 2.0 3.0
H3 H 0.76 2.93 3.0
`;
  const p = MOLECULE_PADDING;

  it("is put in a padded box, as fromXYZ without Lattice", () => {
    const s = fromCIF(water);

    expect(s.sites.map((x) => x.species.symbol)).toEqual(["O", "H", "H"]);
    expect(Array.from(s.lattice.basis.data)).toEqual(
      [1.2 + 2 * p, 0, 0, 0, 0.93 + 2 * p, 0, 0, 0, 2 * p].map((x) =>
        expect.closeTo(x, 12),
      ),
    );
  });

  it("says so in moleculeBox, whose origin gives back the file's positions", () => {
    const s = fromCIF(water);

    expect("moleculeBox" in s && s.moleculeBox?.padding).toBe(p);
    const o = (s as { moleculeBox: { origin: number[] } }).moleculeBox.origin;
    const restored = s.sites.map((site) =>
      Array.from(cartesian(s.lattice, site as never), (x, k) => x + o[k]),
    );
    expect(restored.flat()).toEqual(
      [1.0, 2.0, 3.0, 1.96, 2.0, 3.0, 0.76, 2.93, 3.0].map((x) =>
        expect.closeTo(x, 12),
      ),
    );
  });

  it("is read by parseStructure", () => {
    const { format, structure } = parseStructure(water, {
      fileName: "water.cif",
    });

    expect(format).toBe("cif");
    expect(structure.moleculeBox).toBeDefined();
  });

  it("is written by toCIF in its box, with fractional positions", () => {
    const s = fromCIF(water);
    const again = fromCIF(toCIF(s as never));

    expect("moleculeBox" in again).toBe(false);
    expect(Array.from(again.lattice.basis.data)).toEqual(
      Array.from(s.lattice.basis.data).map((x) => expect.closeTo(x, 5)),
    );
  });

  it("is not read with a cell (the Cartesian frame would be ambiguous)", () => {
    const withCell = water.replace(
      "loop_",
      "_cell_length_a 10\n_cell_length_b 10\n_cell_length_c 10\n" +
        "_cell_angle_alpha 90\n_cell_angle_beta 90\n_cell_angle_gamma 90\nloop_",
    );
    expect(() => fromCIF(withCell)).toThrow(/only read without a cell/);
  });
});
