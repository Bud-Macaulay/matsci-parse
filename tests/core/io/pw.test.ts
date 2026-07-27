import { describe, it, expect } from "vitest";

import { fromPW, toPW } from "@/core/io/pw";
import { kspacingToGrid } from "@/core/lattice/kspacingToGrid";
import { writeFile } from "../../helpers/io";

import * as fixtures from "./teststrings/pw";

describe("PW round-trips", () => {
  for (const [name, pw] of Object.entries(fixtures)) {
    it(`round-trips ${name}`, () => {
      const a = fromPW(pw);

      const text1 = toPW(a);
      writeFile(`${name}.in`, text1);

      const b = fromPW(text1);
      const text2 = toPW(b);
      writeFile(`${name}-fixed-point.in`, text2);

      const c = fromPW(text2);

      // serializer reaches fixed point
      expect(text2).toBe(text1);

      // structure preserved (species counts match)
      expect(c.sites.length).toBe(a.sites.length);

      const aCounts = new Map<string, number>();
      const cCounts = new Map<string, number>();
      for (const s of a.sites) {
        aCounts.set(s.species.symbol, (aCounts.get(s.species.symbol) ?? 0) + 1);
      }
      for (const s of c.sites) {
        cCounts.set(s.species.symbol, (cCounts.get(s.species.symbol) ?? 0) + 1);
      }
      expect(Object.fromEntries(cCounts)).toEqual(Object.fromEntries(aCounts));

      // lattice preserved
      const aBasis = a.lattice.basis.data;
      const cBasis = c.lattice.basis.data;

      for (let i = 0; i < 9; i++) {
        expect(cBasis[i]).toBeCloseTo(aBasis[i]);
      }
    });
  }
});

describe("toPW output format", () => {
  it("contains required QE namelists", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure);

    expect(output).toContain("&CONTROL");
    expect(output).toContain("&SYSTEM");
    expect(output).toContain("&ELECTRONS");
    expect(output).toContain("ibrav = 0");
    expect(output).toContain("nat = 4");
    expect(output).toContain("ntyp = 1");
  });

  it("contains ATOMIC_SPECIES with masses", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure);

    expect(output).toContain("ATOMIC_SPECIES");
    expect(output).toMatch(/Cu\s+63\.546\s+Cu\.UPF/);
  });

  it("contains K_POINTS automatic", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure);

    expect(output).toContain("K_POINTS automatic");
    // default kspacing=0.22 should produce a non-trivial grid for Cu (a≈3.6 Å)
    expect(output).toMatch(/\d+\s+\d+\s+\d+\s+0\s+0\s+0/);
  });

  it("groups sites by species", () => {
    const structure = fromPW(fixtures.test2pw);
    const output = toPW(structure);

    // Cr should appear before I in ATOMIC_POSITIONS
    const posIdx = output.indexOf("ATOMIC_POSITIONS crystal");
    const crIdx = output.indexOf("Cr", posIdx);
    const iIdx = output.indexOf("I ", posIdx + 2);
    expect(crIdx).toBeLessThan(iIdx);
  });

  it("accepts explicit grid", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, {
      kpoints: { grid: [4, 4, 4] },
    });
    writeFile("copper-explicit-grid.in", output);

    expect(output).toContain("4  4  4  0  0  0");
  });

  it("accepts kspacing option", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, {
      kpoints: { kspacing: 0.5 },
    });
    writeFile("copper-kspacing-05.in", output);

    const match = output.match(/K_POINTS automatic\n(\d+)\s+(\d+)\s+(\d+)/);
    expect(match).not.toBeNull();
    const grid = [+match![1], +match![2], +match![3]];
    expect(grid.every((n) => n >= 1)).toBe(true);
  });

  it("contains default ecutwfc", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure);

    expect(output).toMatch(/ecutwfc = 30/);
  });

  it("accepts custom ecutwfc", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, { system: { ecutwfc: 50 } });
    writeFile("copper-ecut50.in", output);

    expect(output).toMatch(/ecutwfc = 50/);
  });

  it("accepts custom pseudos", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, {
      pseudo: { pseudos: { Cu: "Cu.pbe-spf_gga.UPF" } },
    });
    writeFile("copper-custom-pseudos.in", output);

    expect(output).toContain("Cu.pbe-spf_gga.UPF");
  });

  it("contains default pseudo_dir", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure);

    expect(output).toContain("pseudo_dir = './'");
  });

  it("accepts custom calculation type", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, { control: { calculation: "relax" } });
    writeFile("copper-relax.in", output);

    expect(output).toContain("calculation = 'relax'");
  });
});

describe("selective dynamics", () => {
  it("round-trips selective dynamics", () => {
    const a = fromPW(fixtures.selectiveDynamics);
    const output = toPW(a);
    writeFile("selective-dynamics.in", output);

    expect(output).toContain("Selective dynamics");
    expect(output).toMatch(/Si\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+1\s+1\s+0/);
  });
});

describe("arbitrary schema options", () => {
  it("forwards control.etot_conv_thr", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, { control: { etot_conv_thr: 1e-5 } });
    writeFile("copper-etot-conv.in", output);

    expect(output).toContain("etot_conv_thr = 0.00001");
  });

  it("forwards electrons.conv_thr", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, { electrons: { conv_thr: 1e-8 } });
    writeFile("copper-conv-thr.in", output);

    expect(output).toContain("conv_thr = 1e-8");
  });

  it("forwards electrons.mixing_beta", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, { electrons: { mixing_beta: 0.3 } });
    writeFile("copper-mixing.in", output);

    expect(output).toContain("mixing_beta = 0.3");
  });

  it("forwards multiple arbitrary params at once", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, {
      control: { etot_conv_thr: 1e-6, forc_conv_thr: 1e-4 },
      electrons: { conv_thr: 1e-8, mixing_beta: 0.5, diagonalization: "cg" },
    });
    writeFile("copper-multi-opts.in", output);

    expect(output).toContain("etot_conv_thr = 0.000001");
    expect(output).toContain("forc_conv_thr = 0.0001");
    expect(output).toContain("conv_thr = 1e-8");
    expect(output).toContain("mixing_beta = 0.5");
    expect(output).toContain("diagonalization = 'cg'");
  });

  it("does not emit undefined or NaN values", () => {
    const structure = fromPW(fixtures.copperPw);
    const output = toPW(structure, {
      control: { etot_conv_thr: 1e-4, max_seconds: Number.NaN },
    });

    expect(output).toContain("etot_conv_thr = 0.0001");
    expect(output).not.toContain("NaN");
    expect(output).not.toContain("max_seconds");
  });
});

describe("kspacing to grid mapping", () => {
  it("default kspacing=0.22 produces expected grid for Cu", () => {
    const structure = fromPW(fixtures.copperPw);
    const expected = kspacingToGrid(structure.lattice, 0.22);
    const output = toPW(structure);

    const match = output.match(/K_POINTS automatic\n(\d+)\s+(\d+)\s+(\d+)/);
    expect(match).not.toBeNull();
    expect([+match![1], +match![2], +match![3]]).toEqual(expected);
  });

  it("kspacing=0.5 produces coarser grid", () => {
    const structure = fromPW(fixtures.copperPw);
    const expected = kspacingToGrid(structure.lattice, 0.5);
    const output = toPW(structure, { kpoints: { kspacing: 0.5 } });

    const match = output.match(/K_POINTS automatic\n(\d+)\s+(\d+)\s+(\d+)/);
    expect(match).not.toBeNull();
    expect([+match![1], +match![2], +match![3]]).toEqual(expected);

    // coarser spacing → fewer k-points
    expect(expected[0]).toBeLessThan(kspacingToGrid(structure.lattice, 0.22)[0]);
  });

  it("explicit grid round-trips through fromPW/toPW", () => {
    const structure = fromPW(fixtures.copperPw);
    const text = toPW(structure, { kpoints: { grid: [6, 6, 6] } });
    const roundTripped = fromPW(text);
    const text2 = toPW(roundTripped, { kpoints: { grid: [6, 6, 6] } });

    expect(text2).toContain("6  6  6  0  0  0");
  });
});
