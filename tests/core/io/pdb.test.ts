import { describe, expect, it } from "vitest";

import { fromPDB, toPDB } from "@/core/io/pdb";
import { toPOSCAR } from "@/core/io/poscar";

import * as fs from "fs";
import * as path from "path";

import * as fixtures from "./teststrings/pdb";

const OUT_DIR = path.join(process.cwd(), "test-output");

function writeFile(name: string, content: string) {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(OUT_DIR, name), content);
}

describe("PDB round-trip fixtures", () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromPDB(text);

      // DEBUG: write POSCAR from parsed structure
      const poscar = toPOSCAR(a, {
        title: `PDB fixture: ${name}`,
      });

      writeFile(`${name}.vasp`, poscar);

      const text1 = toPDB(a);
      const b = fromPDB(text1);
      const text2 = toPDB(b);
      const c = fromPDB(text2);

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
