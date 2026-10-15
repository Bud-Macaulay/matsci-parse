import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { fromVasprun } from "@/core/io/vasprun";

const FILES = join(
  process.cwd(),
  "tests/external/outputs/vasprun/sources/1/files",
);

// [file, pymatgen Vasprun.final_energy (eV), ionic steps]
const refs: [string, number, number][] = [
  ["magmom_ldau.xml.gz", -66.6133524, 3],
  ["md.xml.gz", -327.73014059, 10],
  ["relaxation.xml.gz", -1.92459954, 3],
  ["sc_overflow.xml.gz", -269.38319884, 29],
  ["Si_bands.xml.gz", -11.02606998, 1],
  ["static_silicon.xml.gz", -10.64527774, 1],
  ["unconverged.xml.gz", -134.33107279, 5],
];

describe.skipIf(!existsSync(FILES))(
  "fromVasprun on pymatgen's test files",
  () => {
    for (const [file, finalEnergy, steps] of refs) {
      it(`${file}: one entry per ionic step, final energy as pymatgen`, () => {
        const v = fromVasprun(
          gunzipSync(readFileSync(join(FILES, file))).toString("latin1"),
        );
        expect(v.structures).toHaveLength(steps);
        expect(v.energies).toHaveLength(steps);
        expect(v.forces).toHaveLength(steps);
        expect(v.stresses).toHaveLength(steps);
        // Several of these files carry VASP's wrong e_0_energy (written as 0).
        expect(v.energies.at(-1)).toBeCloseTo(finalEnergy, 7);
        expect(v.structures.at(-1)!.sites).toHaveLength(
          v.finalStructure.sites.length,
        );
        expect(v.kpoints.kind).toBe("points");
        expect(v.kpoints.points).toHaveLength(v.kpoints.weights!.length);
        expect(v.kpoints.weights!.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
        expect(v.bands!.energies[0]).toHaveLength(v.kpoints.points.length);
        expect(v.dos!.densities[0]).toHaveLength(v.dos!.energies.length);
      });
    }
  },
);

// Minimal inline file: one ionic step with a chosen summary e_0_energy.
function run(e0Summary: number) {
  return `<?xml version="1.0"?>
<modeling>
 <incar><i type="int" name="ENCUT"> 400 </i></incar>
 <kpoints>
  <varray name="kpointlist"><v> 0.0 0.0 0.0 </v><v> 0.5 0.0 0.0 </v></varray>
  <varray name="weights"><v> 0.25 </v><v> 0.75 </v></varray>
 </kpoints>
 <atominfo><array name="atoms"><set><rc><c>Si</c><c>1</c></rc></set></array></atominfo>
 <calculation>
  <scstep><energy><i name="e_fr_energy"> -4.90 </i><i name="e_0_energy"> -4.95 </i></energy></scstep>
  <scstep><energy><i name="e_fr_energy"> -5.00 </i><i name="e_0_energy"> -5.02 </i></energy></scstep>
  <structure>
   <crystal><varray name="basis"><v> 3 0 0 </v><v> 0 3 0 </v><v> 0 0 3 </v></varray></crystal>
   <varray name="positions"><v> 0 0 0 </v></varray>
  </structure>
  <varray name="forces"><v> 0.1 0.2 0.3 </v></varray>
  <energy><i name="e_fr_energy"> -5.00 </i><i name="e_wo_entrp"> -5.04 </i><i name="e_0_energy"> ${e0Summary} </i></energy>
  <eigenvalues><array><set><set comment="spin 1">
   <set comment="kpoint 1"><r> -1.0 1.0 </r></set>
   <set comment="kpoint 2"><r> -0.5 1.0 </r></set>
  </set></set></array></eigenvalues>
  <dos><i name="efermi"> 0.25 </i><total><array><set>
   <set comment="spin 1"><r> -1.0 0.5 0.0 </r><r> 0.0 1.5 1.0 </r></set>
  </set></array></total></dos>
 </calculation>
</modeling>`;
}

describe("fromVasprun", () => {
  it("returns library types: structures, KPointSet, bands, DOS", () => {
    const v = fromVasprun(run(-5.02));
    expect(v.structures).toHaveLength(1);
    expect(v.finalStructure).toBe(v.structures[0]);
    expect(v.forces).toEqual([[[0.1, 0.2, 0.3]]]);
    expect(v.stresses).toEqual([null]);
    expect(v.kpoints).toEqual({
      kind: "points",
      points: [{ coordinate: [0, 0, 0] }, { coordinate: [0.5, 0, 0] }],
      weights: [0.25, 0.75],
      coordinateSystem: "reciprocal",
    });
    expect(v.efermi).toBe(0.25);
    expect(v.bands!.energies).toEqual([[[-1], [-0.5]]]);
    expect(v.dos).toEqual({ energies: [-1, 0], densities: [[0.5, 1.5]] });
    expect(v.incar).toEqual({ ENCUT: 400 });
  });

  it("uses e_0_energy, rebuilt from the last SCF step when VASP wrote it wrong", () => {
    // Correct summary: kept as is.
    expect(fromVasprun(run(-5.02)).energies).toEqual([-5.02]);
    // Wrong summary (0): (e_0 - e_fr) of the last SCF step + e_fr = -5.02.
    expect(fromVasprun(run(0)).energies[0]).toBeCloseTo(-5.02, 10);
  });

  it("can skip band energies and the DOS", () => {
    const v = fromVasprun(run(-5.02), { eigenvalues: false, dos: false });
    expect(v.bands).toBeNull();
    expect(v.dos).toBeNull();
  });
});

// [file, sites, sum of all pDOS values, index and value of site 0's s-orbital
// peak (spin up)], from pymatgen 2025.6.14's Vasprun.pdos.
const pdosRefs: [string, number, number, number, number][] = [
  ["magmom_ldau.xml.gz", 10, 332.128, 264, 0.1676],
  ["relaxation.xml.gz", 1, 11.3617, 275, 0.04],
  ["sc_overflow.xml.gz", 25, 1150.6999, 281, 0.0222],
  ["Si_bands.xml.gz", 2, 71.992, 54, 0.3211],
  ["static_silicon.xml.gz", 2, 68.6948, 77, 0.1857],
  ["unconverged.xml.gz", 14, 507.8406, 207, 0.0937],
];

describe.skipIf(!existsSync(FILES))(
  "projected DOS on pymatgen's test files",
  () => {
    for (const [file, sites, sum, peakIndex, peak] of pdosRefs) {
      it(`${file} matches pymatgen's pdos`, () => {
        const text = gunzipSync(readFileSync(join(FILES, file))).toString(
          "latin1",
        );
        expect(fromVasprun(text).dos!.projected).toBeUndefined(); // opt-in
        const p = fromVasprun(text, { projectedDos: true }).dos!.projected!;
        expect(p.orbitals).toEqual([
          "s",
          "py",
          "pz",
          "px",
          "dxy",
          "dyz",
          "dz2",
          "dxz",
          "dx2",
        ]);
        expect(p.densities).toHaveLength(sites);
        let total = 0;
        for (const site of p.densities)
          for (const spin of site)
            for (const orb of spin) for (const x of orb) total += x;
        expect(total).toBeCloseTo(sum, 3);
        const s0 = p.densities[0]![0]![0]!;
        expect(s0.indexOf(Math.max(...s0))).toBe(peakIndex);
        expect(s0[peakIndex]).toBeCloseTo(peak, 10);
      });
    }
  },
);

describe("fromVasprun projected DOS", () => {
  // Two sites, one spin, LORBIT = 10 style columns (s p d).
  const text = `<?xml version="1.0"?>
<modeling>
 <atominfo><array name="atoms"><set><rc><c>Na</c></rc><rc><c>Cl</c></rc></set></array></atominfo>
 <calculation>
  <structure>
   <crystal><varray name="basis"><v> 4 0 0 </v><v> 0 4 0 </v><v> 0 0 4 </v></varray></crystal>
   <varray name="positions"><v> 0 0 0 </v><v> 0.5 0.5 0.5 </v></varray>
  </structure>
  <energy><i name="e_fr_energy"> -1 </i><i name="e_0_energy"> -1 </i></energy>
  <dos>
   <i name="efermi"> 0.0 </i>
   <total><array><set><set comment="spin 1">
    <r> -1.0 1.0 0.0 </r><r> 0.0 2.0 1.0 </r>
   </set></set></array></total>
   <partial><array>
    <field>energy</field><field> s </field><field> p </field><field> d </field>
    <set>
     <set comment="ion 1"><set comment="spin 1"><r> -1.0 0.1 0.2 0.3 </r><r> 0.0 0.4 0.5 0.6 </r></set></set>
     <set comment="ion 2"><set comment="spin 1"><r> -1.0 0.7 0.8 0.9 </r><r> 0.0 1.0 1.1 1.2 </r></set></set>
    </set>
   </array></partial>
  </dos>
 </calculation>
</modeling>`;

  it("is off by default", () => {
    expect(fromVasprun(text).dos).toEqual({
      energies: [-1, 0],
      densities: [[1, 2]],
    });
  });

  it("returns orbital labels from the file and densities [site][spin][orbital]", () => {
    const p = fromVasprun(text, { projectedDos: true }).dos!.projected!;
    expect(p.orbitals).toEqual(["s", "p", "d"]);
    expect(
      p.densities.map((site) =>
        site.map((spin) => spin.map((o) => Array.from(o))),
      ),
    ).toEqual([
      [
        [
          [0.1, 0.4],
          [0.2, 0.5],
          [0.3, 0.6],
        ],
      ],
      [
        [
          [0.7, 1.0],
          [0.8, 1.1],
          [0.9, 1.2],
        ],
      ],
    ]);
    expect(p.densities[0]![0]![0]).toBeInstanceOf(Float64Array);
  });

  it("is skipped together with the DOS", () => {
    expect(
      fromVasprun(text, { dos: false, projectedDos: true }).dos,
    ).toBeNull();
  });
});
