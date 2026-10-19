import { describe, it, expect } from "vitest";

import { fromPW, toPW, pwSpeciesOrder, alatFromPW } from "@/core/io/pw";
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

describe("fromPW lattice units", () => {
  const base = (system: string, cell: string, positions = "ATOMIC_POSITIONS crystal\nSi 0 0 0") =>
    `&SYSTEM\n ${system}\n nat=1\n ntyp=1\n/\nATOMIC_SPECIES\nSi 28.086 Si.UPF\n${cell}\n${positions}\nK_POINTS gamma\n`;

  it("converts CELL_PARAMETERS bohr to angstrom", () => {
    const s = fromPW(base("ibrav=0", "CELL_PARAMETERS bohr\n 10 0 0\n 0 10 0\n 0 0 10"));
    expect(s.lattice.basis.data[0]).toBeCloseTo(5.29177, 5);
  });

  it("accepts A instead of celldm(1)", () => {
    const s = fromPW(base("ibrav=1, A=3.0", ""));
    expect(s.lattice.basis.data[0]).toBeCloseTo(3.0, 6);
    expect(alatFromPW(base("ibrav=1, A=3.0", ""))).toBeCloseTo(3.0 / 0.529177, 6);
  });

  it("uses |a1| as alat for ibrav=0, including alat-unit positions", () => {
    const text = base(
      "ibrav=0",
      "CELL_PARAMETERS angstrom\n 4 0 0\n 0 5 0\n 0 0 6",
      "ATOMIC_POSITIONS alat\nSi 0.5 0 0",
    );
    expect(alatFromPW(text)).toBeCloseTo(4 / 0.529177, 6);
    expect(fromPW(text).sites[0].frac[0]).toBeCloseTo(0.5, 6);
  });

  it("reads A, B, C and cosines like the equivalent celldm (pw.x abc2celldm)", () => {
    const A = 5, B = 6, C = 7, cAB = -0.3, cAC = 0.2, cBC = 0.1;
    const bohrA = A / 0.529177;
    const cases: [number, string, number[]][] = [
      [5, `cosAB=${cAB}`, [cAB, 0, 0]],
      [12, `cosAB=${cAB}`, [cAB, 0, 0]],
      [-12, `cosAC=${cAC}`, [0, cAC, 0]],
      [14, `cosAB=${cAB}, cosAC=${cAC}, cosBC=${cBC}`, [cBC, cAC, cAB]],
    ];
    for (const [ibrav, cosines, angles] of cases) {
      const abc = fromPW(base(`ibrav=${ibrav}, A=${A}, B=${B}, C=${C}, ${cosines}`, ""));
      const celldm = [bohrA, B / A, C / A, ...angles].map((v, i) => `celldm(${i + 1})=${v}`).join(", ");
      const ref = fromPW(base(`ibrav=${ibrav}, ${celldm}`, ""));
      expect(Array.from(abc.lattice.basis.data)).toEqual(
        Array.from(ref.lattice.basis.data, (v) => expect.closeTo(v, 9)),
      );
    }
  });

  it("rejects both celldm and A, like pw.x", () => {
    expect(() => fromPW(base("ibrav=1, celldm(1)=10, A=3.0", ""))).toThrow(/not both/);
  });

  // QE INPUT_PW: unitless CELL_PARAMETERS are alat if celldm(1)/A is set,
  // else bohr; unitless ATOMIC_POSITIONS are alat. Both deprecated.
  it("reads unitless CELL_PARAMETERS as bohr without a lattice parameter", () => {
    const s = fromPW(base("ibrav=0", "CELL_PARAMETERS\n 10 0 0\n 0 10 0\n 0 0 10"));
    expect(s.lattice.basis.data[0]).toBeCloseTo(5.29177, 5);
  });

  it("reads unitless CELL_PARAMETERS as alat with celldm(1) or A", () => {
    const cell = "CELL_PARAMETERS\n 1 0 0\n 0 1 0\n 0 0 1";
    expect(fromPW(base("ibrav=0, celldm(1)=10.0", cell)).lattice.basis.data[0]).toBeCloseTo(5.29177, 5);
    expect(fromPW(base("ibrav=0, A=3.0", cell)).lattice.basis.data[0]).toBeCloseTo(3.0, 6);
  });

  it("reads unitless ATOMIC_POSITIONS as alat", () => {
    const text = base(
      "ibrav=1, celldm(1)=10.0",
      "",
      "ATOMIC_POSITIONS\nSi 0.25 0 0",
    );
    expect(fromPW(text).sites[0].frac[0]).toBeCloseTo(0.25, 6);
    const ibrav0 = base(
      "ibrav=0",
      "CELL_PARAMETERS angstrom\n 4 0 0\n 0 4 0\n 0 0 4",
      "ATOMIC_POSITIONS\nSi 0.5 0 0",
    );
    expect(fromPW(ibrav0).sites[0].frac[0]).toBeCloseTo(0.5, 6);
  });
});

describe("fromPW validateSpecies", () => {
  const pw = (label: string, pseudo: string, ntyp = "\n ntyp=1") =>
    `&SYSTEM\n ibrav=1, celldm(1)=10\n nat=1${ntyp}\n/\nATOMIC_SPECIES\n${label} 55.85 ${pseudo}\nATOMIC_POSITIONS crystal\n${label} 0 0 0\nK_POINTS gamma\n`;
  const symbol = (label: string, pseudo: string) => fromPW(pw(label, pseudo)).sites[0].species.symbol;

  it("accepts labels that match the pseudopotential's element", () => {
    expect(symbol("Fe", "Fe.pbe-spn-kjpaw_psl.0.2.1.UPF")).toBe("Fe");
    expect(symbol("Fe1", "fe_pbe_v1.5.uspp.F.UPF")).toBe("Fe");
    expect(symbol("Fe_up", "Fe_ONCV_PBE-1.0.upf")).toBe("Fe");
  });

  it("accepts pseudopotential names that don't start with an element", () => {
    for (const pseudo of ["my_iron.UPF", "pseudo.UPF", "new_PP.UPF", "B3LYP.upf", "PAW_PBE_Fe.upf"]) {
      expect(symbol("Fe", pseudo)).toBe("Fe");
    }
  });

  it("rejects a label whose element disagrees with the pseudopotential", () => {
    expect(() => fromPW(pw("Y2", "O.pbe.UPF"))).toThrow(/'Y2' looks like element Y.*'O.pbe.UPF' looks like O/);
    expect(() => fromPW(pw("Fe", "In-house-v2.UPF"))).toThrow(/looks like In/);
    expect(() => fromPW(pw("X1", "Fe.pbe.UPF"))).toThrow(/'X1' looks like no element/);
    // also without ntyp, reading the card up to the next one
    expect(() => fromPW(pw("Y2", "O.pbe.UPF", ""))).toThrow(/looks like O/);
  });

  it("can be disabled", () => {
    expect(fromPW(pw("Y2", "O.pbe.UPF"), false).sites[0].species.symbol).toBe("Y");
  });
});

describe("fromPW card layout", () => {
  it("skips blank and comment lines inside cards, like pw.x", () => {
    const s = fromPW(
      "&SYSTEM\n ibrav=0\n nat=2\n ntyp=1\n/\nATOMIC_SPECIES\nSi 28.086 Si.UPF\n" +
        "CELL_PARAMETERS angstrom\n\n! a comment\n 5 0 0\n\n 0 5 0\n # another\n 0 0 5\n" +
        "ATOMIC_POSITIONS crystal\n\nSi 0 0 0\n! between atoms\nSi 0.25 0.25 0.25\n\nK_POINTS gamma\n",
    );
    expect(Array.from(s.lattice.basis.data)).toEqual([5, 0, 0, 0, 5, 0, 0, 0, 5]);
    expect(s.sites.map((x) => Array.from(x.frac))).toEqual([[0, 0, 0], [0.25, 0.25, 0.25]]);
  });

  it("says when ATOMIC_POSITIONS has no readable atoms", () => {
    expect(() =>
      fromPW("&SYSTEM\n ibrav=1, celldm(1)=10, nat=1, ntyp=1\n/\nATOMIC_SPECIES\nSi 28 Si.UPF\nATOMIC_POSITIONS alat\nSi 1/4 0 0\n"),
    ).toThrow(/No atoms read from ATOMIC_POSITIONS/);
  });
});
