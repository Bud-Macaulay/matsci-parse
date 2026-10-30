import { describe, expect, it } from "vitest";

import { fromPDB, toPDB } from "@/core/io/pdb";
import { toPOSCAR } from "@/core/io/poscar";

import * as fixtures from "./teststrings/pdb";
import { writeFile } from "../../helpers/io";

describe("PDB round-trip fixtures", () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromPDB(text);

      // DEBUG: write POSCAR from parsed structure
      // const poscar = toPOSCAR(a, {
      //   title: `PDB fixture: ${name}`,
      // });

      // writeFile(`${name}.vasp`, poscar);

      const text1 = toPDB(a);
      const b = fromPDB(text1);
      const text2 = toPDB(b);
      const c = fromPDB(text2);

      expect(text2).toBe(text1);

      expect(c.sites.length).toBe(a.sites.length);

      // if its round trip-able we presume its valid as a parser
      for (let i = 0; i < a.sites.length; i++) {
        expect(c.sites[i].species.symbol).toBe(a.sites[i].species.symbol);

        expect(c.sites[i].frac[0]).toBeCloseTo(a.sites[i].frac[0], 6);
        expect(c.sites[i].frac[1]).toBeCloseTo(a.sites[i].frac[1], 6);
        expect(c.sites[i].frac[2]).toBeCloseTo(a.sites[i].frac[2], 6);
      }

      const m1 = a.lattice.basis.data;
      const m2 = c.lattice.basis.data;

      for (let i = 0; i < 9; i++) {
        expect(m2[i]).toBeCloseTo(m1[i], 6);
      }
    });
  }
});

describe("PDB without a usable CRYST1", () => {
  it("sets moleculeBox (the box is not from the file)", () => {
    // pdbExample has no CRYST1; pdbExample2 a 1 x 1 x 1 placeholder
    for (const text of [fixtures.pdbExample, fixtures.pdbExample2]) {
      expect(fromPDB(text).moleculeBox?.padding).toBe(10);
    }
  });

  it("does not set it for a real cell", () => {
    // pdbExample4's CRYST1 is smaller than its atoms and is not used either
    const pdb = [
      "CRYST1   10.000   10.000   10.000  90.00  90.00  90.00 P 1           1",
      "ATOM      1  O   HOH A   1       1.000   1.000   1.000  1.00  0.00           O",
      "ATOM      2  H   HOH A   1       1.960   1.000   1.000  1.00  0.00           H",
      "END",
    ].join("\n");

    expect(fromPDB(pdb).moleculeBox).toBeUndefined();
  });
});
