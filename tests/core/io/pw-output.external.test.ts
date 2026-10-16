import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { fromPWXML } from "@/core/io/pw";
import { submoduleExists } from "../../helpers/external";

// Real pw.x XML outputs (see tests/external/outputs/pw-xml/SOURCE.yaml).
const DIR = join(process.cwd(), "tests", "external", "outputs", "pw-xml", "files");
const files = submoduleExists && existsSync(DIR) ? readdirSync(DIR).sort() : [];

const nums = (s: string) => s.trim().split(/\s+/).map(Number);

describe.skipIf(files.length === 0)("pw.x XML outputs from the external test suite", () => {
  it.each(files)("%s", (file) => {
    const text = readFileSync(join(DIR, file), "utf-8");
    const r = fromPWXML(text);
    const output = text.slice(text.indexOf("<output>"));

    // atoms and ionic steps as declared in the file
    const nat = Number(/<atomic_structure[^>]*nat="(\d+)"/.exec(output)![1]);
    expect(r.finalStructure.sites).toHaveLength(nat);
    expect(r.steps).toHaveLength((text.match(/<step\b/g) ?? []).length);
    for (const v of [r.energy, ...(r.forces ?? []).flat()]) {
      if (v !== null) expect(Number.isFinite(v)).toBe(true);
    }

    if (!r.bands) return;

    // electrons: Σ_spin Σ_k w_k Σ_band f = nelec
    const nelec = Number(/<nelec>\s*([^<\s]+)/.exec(output)![1]);
    let electrons = 0;
    r.bands.occupations.forEach((spin) =>
      spin.forEach((occ, k) => (electrons += r.kpoints.weights![k] * occ.reduce((a, b) => a + b, 0))),
    );
    expect(Math.abs(electrons - nelec) / nelec).toBeLessThan(1e-3);

    // k-points, by a second route: f_i = k · a_i / alat (k in 2π/alat, a_i in Bohr)
    const alat = Number(/<atomic_structure[^>]*alat="([^"]+)"/.exec(output)![1]);
    const a = ["a1", "a2", "a3"].map((t) => nums(new RegExp(`<${t}>([^<]+)</${t}>`).exec(output)![1]));
    // the k-point of each <ks_energies> block (not <starting_k_points>, which may repeat them)
    const kcart = [...output.matchAll(/<ks_energies>\s*<k_point weight="[^"]*">([^<]+)<\/k_point>/g)].map((m) => nums(m[1]));
    expect(r.kpoints.points).toHaveLength(kcart.length);
    r.kpoints.points.forEach((p, k) => {
      for (let i = 0; i < 3; i++) {
        const expected = (kcart[k][0] * a[i][0] + kcart[k][1] * a[i][1] + kcart[k][2] * a[i][2]) / alat;
        expect(p.coordinate[i]).toBeCloseTo(expected, 8);
      }
    });
  });
});
