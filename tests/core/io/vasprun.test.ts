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
