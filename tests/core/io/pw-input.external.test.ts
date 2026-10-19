import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { alatFromPW, fromPW } from "@/core/io/pw";
import { cartesian } from "@/core/site/cartesian";
import { LengthUnitSystem } from "@/core/units/length";
import { submoduleExists } from "../../helpers/external";

// Real pw.x inputs, each with a reference (see tests/external/inputs/pw/SOURCE.yaml):
// PW_NNN.out is the pw.x benchmark output, PW_NNN.json the qe-tools parse.
const DIR = join(process.cwd(), "tests", "external", "inputs", "pw", "files");
const inputs = submoduleExists && existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".in")).sort() : [];
const withRef = (ext: string) => inputs.filter((f) => existsSync(join(DIR, f.replace(/\.in$/, ext))));

const BOHR = LengthUnitSystem.convert(1, "bohr", "angstrom");
const nums = (s: string) => s.trim().split(/\s+/).map(Number);
const read = (file: string, ext = "") => readFileSync(join(DIR, file.replace(/\.in$/, ext || ".in")), "utf-8");

// pw.x input features fromPW does not support yet, by upstream file
// (manifest.tsv). These are expected to fail; remove an entry once supported.
const UNSUPPORTED: Record<string, string> = {
  "q-e/test-suite/pw_eval/eval_infix.in": "arithmetic expressions in ATOMIC_POSITIONS",
  "q-e/test-suite/pw_lattice-ibrav/lattice-wyckoff-sio2.in": "space_group with crystal_sg (Wyckoff) positions",
};
const manifestPath = join(DIR, "..", "manifest.tsv");
const upstream = new Map(
  existsSync(manifestPath)
    ? readFileSync(manifestPath, "utf-8").trim().split("\n").slice(1).map((l) => l.split("\t") as [string, string])
    : [],
);
const unsupported = (file: string) => UNSUPPORTED[upstream.get(file.replace(/\.in$/, "")) ?? ""];

/** Cell (Å, rows) of a structure as plain arrays. */
const rows = (data: ArrayLike<number>) => [0, 1, 2].map((i) => Array.from(data).slice(3 * i, 3 * i + 3));

describe.skipIf(inputs.length === 0)("pw.x inputs from the external test suite", () => {
  // pw.x prints celldm(1) to 6 decimals, the axes to 6 and positions to 7.
  const TOL_ANG = 1e-4;

  describe.each(withRef(".out"))("%s vs pw.x output", (file) => {
    const text = read(file);
    const out = read(file, ".out");
    const alat = Number(/celldm\(1\)=\s*(\S+)/.exec(out)![1]);
    const nat = Number(/number of atoms\/cell\s*=\s*(\d+)/.exec(out)![1]);
    const axesBlock = out.slice(out.indexOf("crystal axes"));
    const axes = [1, 2, 3].map((i) =>
      nums(new RegExp(`a\\(${i}\\) = \\(([^)]+)\\)`).exec(axesBlock)![1]).map((x) => x * alat * BOHR),
    );
    const posBlock = out.slice(out.indexOf("positions (alat units)"));
    const tau = [...posBlock.matchAll(/tau\(\s*\d+\)\s*=\s*\(([^)]+)\)/g)]
      .slice(0, nat)
      .map((m) => nums(m[1]).map((x) => x * alat * BOHR));

    const reason = unsupported(file);
    (reason ? it.fails : it)(`cell, alat and positions match pw.x${reason ? ` (unsupported: ${reason})` : ""}`, () => {
      const s = fromPW(text);
      expect(s.sites).toHaveLength(nat);
      expect(rows(s.lattice.basis.data)).toEqual(axes.map((r) => r.map((x) => expect.closeTo(x, 4))));
      expect(Math.abs(alatFromPW(text) - alat)).toBeLessThan(1e-5 * alat);
      s.sites.forEach((site, i) => {
        const r = Array.from(cartesian(s.lattice, site));
        r.forEach((x, j) => expect(Math.abs(x - tau[i][j])).toBeLessThan(TOL_ANG));
      });
    });
  });

  describe.each(withRef(".json"))("%s vs qe-tools", (file) => {
    const text = read(file);
    const ref = JSON.parse(read(file, ".json"));
    const species = ref.atomic_species;
    // qe-tools rejects labels that disagree with their pseudopotential file
    // name; fromPW does too when the file name starts with an element.
    const consistent = species.names.every((name: string, i: number) =>
      new RegExp(`^${species.pseudo_file_names[i].split(/[-._]/)[0]}_?\\d*$`, "i").test(name),
    );

    it("cell matches", () => {
      const s = fromPW(text, false);
      expect(s.sites).toHaveLength(ref.atomic_positions.names.length);
      expect(rows(s.lattice.basis.data)).toEqual(
        ref.cell.map((r: number[]) => r.map((x) => expect.closeTo(x, 4))),
      );
      if (!consistent) expect(() => fromPW(text)).toThrow(/pseudopotential/);
    });
  });
});
