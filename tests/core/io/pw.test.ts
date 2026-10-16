import { describe, it, expect } from "vitest";

import { fromPW, toPW, pwSpeciesOrder } from "@/core/io/pw";
import { createLattice } from "@/core/lattice/lattice";
import type { Structure } from "@/core/structure/structure";
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

// ──────────────────────────────────────────────────────────────────────
//  Species labels (kinds), &IONS / &CELL, KPoints, array namelists
// ──────────────────────────────────────────────────────────────────────

/** Two-site bcc Fe cell plus one O: enough to split Fe into two kinds. */
function feFeO(): Structure {
  return {
    lattice: createLattice([2.87, 2.87, 2.87]),
    sites: [
      { species: { symbol: "Fe" }, frac: new Float64Array([0, 0, 0]) },
      { species: { symbol: "O" }, frac: new Float64Array([0.25, 0.25, 0.25]) },
      { species: { symbol: "Fe" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
    ],
  };
}

/** Lines of a card, from its header up to (not including) the blank line ending it. */
function block(text: string, header: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.startsWith(header));
  const end = lines.findIndex((l, i) => i > start && l === "");
  return lines.slice(start, end === -1 ? undefined : end);
}

describe("toPW species labels (kinds)", () => {
  it("writes one QE species per label, sharing the element's mass and pseudo", () => {
    const text = toPW(feFeO(), { kinds: ["Fe1", "O", "Fe2"] });
    const species = block(text, "ATOMIC_SPECIES");

    expect(species).toHaveLength(4);
    expect(species[1]).toMatch(/^Fe1\s+55\.8\d*\s+Fe\.UPF$/);
    expect(species[2]).toMatch(/^O\s+15\.99\d*\s+O\.UPF$/);
    expect(species[3]).toMatch(/^Fe2\s+55\.8\d*\s+Fe\.UPF$/);
    expect(text).toContain("ntyp = 3");
  });

  it("groups positions by label in first-appearance order", () => {
    const positions = block(
      toPW(feFeO(), { kinds: ["Fe1", "O", "Fe2"] }),
      "ATOMIC_POSITIONS",
    );

    expect(positions.slice(1, 4)).toEqual([
      "Fe1 0 0 0",
      "O 0.25 0.25 0.25",
      "Fe2 0.5 0.5 0.5",
    ]);
  });

  it("looks up pseudos by label first, then by element", () => {
    const text = toPW(feFeO(), {
      kinds: ["Fe1", "O", "Fe2"],
      pseudo: { pseudos: { Fe2: "Fe_up.upf", Fe: "Fe_std.upf" } },
    });

    expect(text).toMatch(/^Fe1\s+\S+\s+Fe_std\.upf$/m);
    expect(text).toMatch(/^Fe2\s+\S+\s+Fe_up\.upf$/m);
  });

  it("exposes the species order used for per-species arrays", () => {
    expect(pwSpeciesOrder(feFeO())).toEqual(["Fe", "O"]);
    expect(pwSpeciesOrder(feFeO(), ["Fe1", "O", "Fe2"])).toEqual([
      "Fe1",
      "O",
      "Fe2",
    ]);
  });

  it("rejects a label count that does not match the sites", () => {
    expect(() => toPW(feFeO(), { kinds: ["Fe1", "O"] })).toThrow(
      "kinds has 2 labels but the structure has 3 sites",
    );
  });

  it("rejects one label standing for two elements", () => {
    expect(() => toPW(feFeO(), { kinds: ["X", "X", "Fe2"] })).toThrow(
      "Species label 'X' is used for both Fe and O",
    );
  });
});

describe("toPW per-species arrays", () => {
  it("writes array options as indexed Fortran entries", () => {
    const text = toPW(feFeO(), {
      kinds: ["Fe1", "O", "Fe2"],
      system: { ecutwfc: 40, nspin: 2, starting_magnetization: [0.5, 0, -0.5] },
    });

    expect(text).toContain("  starting_magnetization(1) = 0.5");
    expect(text).toContain("  starting_magnetization(2) = 0");
    expect(text).toContain("  starting_magnetization(3) = -0.5");
    expect(text).not.toContain("starting_magnetization = ");
  });
});

describe("toPW &IONS / &CELL", () => {
  const namelists = (text: string) =>
    text.split("\n").filter((l) => l.startsWith("&"));

  it("omits both for scf", () => {
    expect(namelists(toPW(feFeO()))).toEqual([
      "&CONTROL",
      "&SYSTEM",
      "&ELECTRONS",
    ]);
  });

  it("writes &IONS for relax", () => {
    const text = toPW(feFeO(), {
      control: { calculation: "relax" },
      ions: { ion_dynamics: "bfgs" },
    });

    expect(namelists(text)).toEqual(["&CONTROL", "&SYSTEM", "&ELECTRONS", "&IONS"]);
    expect(text).toContain("  ion_dynamics = 'bfgs'");
  });

  it("writes &IONS and &CELL for vc-relax, even when not given", () => {
    const text = toPW(feFeO(), { control: { calculation: "vc-relax" } });

    expect(namelists(text)).toEqual([
      "&CONTROL",
      "&SYSTEM",
      "&ELECTRONS",
      "&IONS",
      "&CELL",
    ]);
  });

  it("forwards cell options", () => {
    const text = toPW(feFeO(), {
      control: { calculation: "vc-relax" },
      cell: { cell_dofree: "shape", press_conv_thr: 0.5 },
    });

    expect(text).toContain("  cell_dofree = 'shape'");
    expect(text).toContain("  press_conv_thr = 0.5");
  });

  it("rejects &IONS / &CELL options pw.x would not read", () => {
    expect(() => toPW(feFeO(), { ions: { ion_dynamics: "bfgs" } })).toThrow(
      "&IONS is only read for relax, md, vc-relax, vc-md, not calculation = 'scf'",
    );
    expect(() =>
      toPW(feFeO(), {
        control: { calculation: "relax" },
        cell: { cell_dofree: "all" },
      }),
    ).toThrow("&CELL is only read for vc-relax, vc-md, not calculation = 'relax'");
  });
});

describe("toPW canonical k-points", () => {
  it("writes a band path as a crystal_b card", () => {
    const text = toPW(feFeO(), {
      control: { calculation: "bands" },
      kpoints: {
        kind: "path",
        points: { G: [0, 0, 0], H: [0.5, -0.5, 0.5] },
        segments: [["G", "H"]],
        density: 20,
      },
    });

    expect(block(text, "K_POINTS")).toEqual([
      "K_POINTS crystal_b",
      "2",
      "0 0 0 20 ! G",
      "0.5 -0.5 0.5 1 ! H",
    ]);
  });

  it("writes a canonical grid as an automatic card", () => {
    const text = toPW(feFeO(), {
      kpoints: {
        kind: "grid",
        mesh: [6, 6, 6],
        origin: [0, 0, 0],
        scheme: "gamma-centered",
      },
    });

    expect(text).toContain("K_POINTS automatic\n6 6 6 0 0 0");
  });
});

describe("fromPW alat units", () => {
  // celldm(1) = 10 Bohr = 5.29177 Å.
  const header = `&CONTROL
/
&SYSTEM
  ibrav = 0
  nat = 1
  ntyp = 1
  celldm(1) = 10.0
  ecutwfc = 30
/
&ELECTRONS
/
ATOMIC_SPECIES
Si 28.085 Si.UPF
K_POINTS gamma
`;

  it("scales CELL_PARAMETERS alat by celldm(1) in Bohr", () => {
    const s = fromPW(`${header}CELL_PARAMETERS alat
1.0 0.0 0.0
0.0 1.0 0.0
0.0 0.0 1.0
ATOMIC_POSITIONS crystal
Si 0.0 0.0 0.0
`);

    expect(s.lattice.basis.data[0]).toBeCloseTo(5.29177, 5);
    expect(s.lattice.basis.data[8]).toBeCloseTo(5.29177, 5);
  });

  it("scales ATOMIC_POSITIONS alat by celldm(1) in Bohr", () => {
    const s = fromPW(`${header}CELL_PARAMETERS angstrom
5.29177 0.0 0.0
0.0 5.29177 0.0
0.0 0.0 5.29177
ATOMIC_POSITIONS alat
Si 0.5 0.0 0.0
`);

    // 0.5 alat = 5 Bohr = 2.645885 Å = half the 5.29177 Å cell.
    expect(s.sites[0].frac[0]).toBeCloseTo(0.5, 6);
  });
});

describe("fromPW species labels", () => {
  const afm = `&CONTROL
/
&SYSTEM
  ibrav = 0
  nat = 3
  ntyp = 3
  ecutwfc = 30
  nspin = 2
  starting_magnetization(1) = 0.5
  starting_magnetization(3) = -0.5
/
&ELECTRONS
/
ATOMIC_SPECIES
Fe1 55.845 Fe.UPF
O 15.999 O.UPF
Fe2 55.845 Fe.UPF
K_POINTS gamma
CELL_PARAMETERS angstrom
2.87 0.0 0.0
0.0 2.87 0.0
0.0 0.0 2.87
ATOMIC_POSITIONS crystal
Fe1 0.0 0.0 0.0
O 0.25 0.25 0.25
Fe2 0.5 0.5 0.5
`;

  it("reads labels as their element, keeping the label as properties.kind", () => {
    const s = fromPW(afm);

    expect(s.sites.map((x) => x.species.symbol)).toEqual(["Fe", "O", "Fe"]);
    expect(s.sites.map((x) => x.properties?.kind)).toEqual([
      "Fe1",
      undefined,
      "Fe2",
    ]);
  });

  it("maps label suffixes to the longest matching element", () => {
    const text = afm
      .replaceAll("Fe1", "Fe_")
      .replaceAll("Fe2", "Co1")
      .replace("Co1 55.845 Fe.UPF", "Co1 58.933 Co.UPF");
    expect(fromPW(text).sites.map((x) => x.species.symbol)).toEqual([
      "Fe",
      "O",
      "Co",
    ]);
  });

  it("writes the labels back, so species stay split on a round trip", () => {
    const text = toPW(fromPW(afm));

    expect(block(text, "ATOMIC_SPECIES").slice(1).map((l) => l.split(/\s+/)[0])).toEqual([
      "Fe1",
      "O",
      "Fe2",
    ]);
    expect(text).toContain("ntyp = 3");
    expect(fromPW(text).sites.map((x) => x.properties?.kind)).toEqual([
      "Fe1",
      undefined,
      "Fe2",
    ]);
  });
});
