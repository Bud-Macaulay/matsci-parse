import { describe, expect, it } from "vitest";

import { fromGRO, toGRO } from "@/core/io/gro";
import { fromGRO as parseGROAgain } from "@/core/io/gro";

import { toPOSCAR } from "@/core/io/poscar";

import * as fixtures from "./teststrings/gro";
import { writeFile } from "../../helpers/io";

describe("GRO round-trip fixtures", () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromGRO(text);

      //   DEBUG: write POSCAR from parsed structure
      const poscar = toPOSCAR(a, {
        title: `PDB fixture: ${name}`,
      });

      writeFile(`${name}.vasp`, poscar);

      const text1 = toGRO(a);

      const b = parseGROAgain(text1);

      const text2 = toGRO(b);

      const c = parseGROAgain(text2);

      // serializer reaches fixed point
      expect(text2).toBe(text1);

      expect(c.sites.length).toBe(a.sites.length);

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
