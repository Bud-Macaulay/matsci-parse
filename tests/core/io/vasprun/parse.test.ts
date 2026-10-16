import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { parseVasprun } from "@/core/io/vasprun/parse";

// ---------------------------------------------------------------- real files

const FILES = join(
  process.cwd(),
  "tests/external/outputs/vasprun/sources/1/files",
);

// Reference values from pymatgen 2025.6.14 (Vasprun) and, for stress, ASE
// 3.25 (eV/Å³, physical sign; diagonal, since ASE symmetrizes the tensor).
const refs = [
  {
    file: "magmom_ldau.xml.gz",
    steps: 3,
    sites: 10,
    energy: [-66.6133524, -66.6133524, 0.0],
    force0: [0.00208154, 0.00142282, 0.0039782],
    stressDiag: [0.00356109713, 0.0038669556, 0.00203823505],
    lattice0: [-1.65788306, -4.25411895, 2.38896088],
    converged: [true, true],
    kpoints: 32,
    efermi: 3.12362836,
    spins: 2,
    eigShape: [32, 68],
    eig00: -54.4965,
    dosPoints: 301,
    nelm: 100,
  },
  {
    file: "md.xml.gz",
    steps: 10,
    sites: 64,
    energy: [-327.76427636, -327.69600483, -327.73014059],
    force0: [1.07248398, -0.20796844, -1.12297602],
    stressDiag: [-0.0204012387, -0.0214406306, -0.0189606632],
    lattice0: [10.8618, 0.0, 0.0],
    converged: [true, true],
    kpoints: 1,
    efermi: 6.2108706,
    spins: 1,
    eigShape: [1, 161],
    eig00: -6.2512,
    dosPoints: 301,
    nelm: 60,
  },
  {
    file: "relaxation.xml.gz",
    steps: 3,
    sites: 1,
    energy: [-1.92459954, -1.92459954, 0.0],
    force0: [0, 0, 0],
    stressDiag: [0.000718074128, 0.000718074128, 0.000718074128],
    lattice0: [1.71975133, 1.71975133, 1.71975133],
    converged: [true, true],
    kpoints: 16,
    efermi: -0.19712906,
    spins: 2,
    eigShape: [16, 5],
    eig00: -46.7601,
    dosPoints: 301,
    nelm: 100,
  },
  {
    file: "sc_overflow.xml.gz",
    steps: 29,
    sites: 25,
    energy: [-269.38319884, -269.38319884, 0.0],
    force0: [0.07069918, -0.05348948, -0.03962934],
    stressDiag: [-2.28859412e-5, -0.000279624315, 0.000723453741],
    lattice0: [9.97164032, -0.01506352, 0.10696538],
    converged: [true, true],
    kpoints: 24,
    efermi: 1.8301027,
    spins: 2,
    eigShape: [24, 96],
    eig00: -21.6959,
    dosPoints: 301,
    nelm: 60,
  },
  {
    file: "Si_bands.xml.gz",
    steps: 1,
    sites: 2,
    energy: [-11.02606998, -11.02606998, 0.0],
    force0: [0, 0, 0],
    stressDiag: [0.00536222859, 0.00536222859, 0.00536222859],
    lattice0: [0.0, 2.734365, 2.734365],
    converged: [true, true],
    kpoints: 160,
    efermi: 5.85611255,
    spins: 2,
    eigShape: [160, 13],
    eig00: -6.1991,
    dosPoints: 301,
    nelm: 100,
  },
  {
    file: "static_silicon.xml.gz",
    steps: 1,
    sites: 2,
    energy: [-10.64527774, -10.64527774, 0.0],
    force0: [0, 0, 0],
    stressDiag: [0.0095033963, 0.0095033963, 0.0095033963],
    lattice0: [0.0, 2.734364, 2.734364],
    converged: [true, true],
    kpoints: 10,
    efermi: 5.46766285,
    spins: 2,
    eigShape: [10, 9],
    eig00: -6.0189,
    dosPoints: 301,
    nelm: 100,
  },
  {
    file: "unconverged.xml.gz",
    steps: 5,
    sites: 14,
    energy: [-134.33107279, -134.33107279, 0.0],
    force0: [-1.35651561, 0, -2.12732337],
    stressDiag: [-0.595414757, -0.265791484, 0.155665303],
    lattice0: [11.5427878, 0.0, 0.0],
    converged: [false, true],
    kpoints: 12,
    efermi: 0.63706997,
    spins: 2,
    eigShape: [12, 75],
    eig00: -34.1893,
    dosPoints: 301,
    nelm: 100,
  },
];

const near = (a: number, b: number, digits = 7) =>
  expect(a).toBeCloseTo(b, digits);

describe.skipIf(!existsSync(FILES))(
  "parseVasprun on pymatgen's test files",
  () => {
    for (const r of refs) {
      it(`${r.file} matches pymatgen / ASE`, () => {
        const v = parseVasprun(
          gunzipSync(readFileSync(join(FILES, r.file))).toString("latin1"),
        );
        const last = v.ionicSteps.at(-1)!;
        expect(v.ionicSteps).toHaveLength(r.steps);
        expect(v.finalStructure.sites).toHaveLength(r.sites);
        expect(v.species).toHaveLength(r.sites);
        [
          last.energy.free,
          last.energy.withoutEntropy,
          last.energy.sigma0,
        ].forEach((e, i) => near(e, r.energy[i]!));
        last.forces![0]!.forEach((f, i) => near(f, r.force0[i]!));
        r.stressDiag.forEach((s, i) => near(last.stress![i]![i]!, s, 9));
        Array.from(v.finalStructure.lattice.basis.data.slice(0, 3)).forEach(
          (x, i) => near(x, r.lattice0[i]!),
        );
        expect([v.converged.electronic, v.converged.ionic]).toEqual(
          r.converged,
        );
        expect(v.kpoints.kpoints).toHaveLength(r.kpoints);
        expect(v.kpoints.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
        near(v.efermi!, r.efermi);
        expect(v.eigenvalues!.energies).toHaveLength(r.spins);
        expect(v.eigenvalues!.energies[0]).toHaveLength(r.eigShape[0]!);
        expect(v.eigenvalues!.energies[0]![0]).toHaveLength(r.eigShape[1]!);
        near(v.eigenvalues!.energies[0]![0]![0]!, r.eig00);
        expect(v.dos!.energies).toHaveLength(r.dosPoints);
        expect(v.dos!.total).toHaveLength(r.spins);
        expect(v.parameters.NELM).toBe(r.nelm);
      });
    }
  },
);

// ---------------------------------------------------------------- inline XML

interface Calc {
  scsteps?: number;
  stress?: string;
  dos?: number[]; // one <dos> block per Fermi energy
}

function vasprun({
  incar = "",
  params = "",
  calcs = [{}] as Calc[],
  final = true,
} = {}): string {
  const structure = (name?: string) => `
 <structure${name ? ` name="${name}"` : ""}>
  <crystal>
   <varray name="basis"><v> 4.0 0.0 0.0 </v><v> 0.0 4.0 0.0 </v><v> 0.0 0.0 4.0 </v></varray>
  </crystal>
  <varray name="positions"><v> 0.0 0.0 0.0 </v><v> 0.5 0.5 0.5 </v></varray>
 </structure>`;
  const calc = (c: Calc) => `
 <calculation>
  ${'<scstep><energy><i name="e_fr_energy"> -1.0 </i></energy></scstep>'.repeat(c.scsteps ?? 3)}
  ${structure()}
  <varray name="forces"><v> 0.1 0.0 0.0 </v><v> ******** 0.0 0.0 </v></varray>
  <varray name="stress">${c.stress ?? "<v> -10.0 0.0 0.0 </v><v> 0.0 -10.0 0.0 </v><v> 0.0 0.0 -10.0 </v>"}</varray>
  <energy><i name="e_fr_energy"> -5.5 </i><i name="e_wo_entrp"> -5.4 </i><i name="e_0_energy"> -5.45 </i></energy>
  <eigenvalues><array><set>
   <set comment="spin 1"><set comment="kpoint 1"><r> -3.0 1.0 </r><r> 2.0 0.0 </r></set></set>
  </set></array></eigenvalues>
  ${(c.dos ?? [1.5])
    .map(
      (ef) => `<dos><i name="efermi"> ${ef} </i><total><array><set>
       <set comment="spin 1"><r> -1.0 0.0 0.0 </r><r> 0.0 2.0 1.0 </r></set>
      </set></array></total></dos>`,
    )
    .join("")}
 </calculation>`;
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<modeling>
 <generator><i name="program" type="string">vasp </i><i name="version" type="string">6.4.3 </i></generator>
 <incar>${incar}</incar>
 <kpoints>
  <generation param="Gamma"><v type="int" name="divisions"> 2 2 2 </v></generation>
  <varray name="kpointlist"><v> 0.0 0.0 0.0 </v></varray>
  <varray name="weights"><v> 1.0 </v></varray>
 </kpoints>
 <parameters>${params}</parameters>
 <atominfo>
  <array name="atoms"><set><rc><c>Na</c><c>1</c></rc><rc><c>Cl</c><c>2</c></rc></set></array>
  <array name="atomtypes"><set>
   <rc><c> 1</c><c>Na</c><c> 22.99</c><c> 7.0</c><c> PAW_PBE Na_pv 19Sep2006 </c></rc>
   <rc><c> 1</c><c>Cl</c><c> 35.45</c><c> 7.0</c><c> PAW_PBE Cl 06Sep2000 </c></rc>
  </set></array>
 </atominfo>
 ${structure("initialpos")}
 ${calcs.map(calc).join("")}
 ${final ? structure("finalpos") : ""}
</modeling>`;
}

describe("parseVasprun", () => {
  it("reads settings, atoms, structures, and one ionic step", () => {
    const v = parseVasprun(
      vasprun({
        incar: `<i type="int" name="ENCUT"> 520 </i><i type="logical" name="LWAVE"> F </i><i type="string" name="GGA    ">PE</i><v type="int" name="MAGMOM"> 1 1 </v>`,
      }),
    );
    expect(v.generator.version).toBe("6.4.3");
    expect(v.incar).toMatchObject({
      ENCUT: 520,
      LWAVE: false,
      GGA: "PE",
      MAGMOM: [1, 1],
    });
    expect(v.species).toEqual(["Na", "Cl"]);
    expect(v.atomTypes[0]).toEqual({
      element: "Na",
      count: 1,
      mass: 22.99,
      valence: 7,
      pseudopotential: "PAW_PBE Na_pv 19Sep2006",
    });
    expect(v.finalStructure.sites.map((s) => s.species.symbol)).toEqual([
      "Na",
      "Cl",
    ]);
    expect(Array.from(v.finalStructure.sites[1]!.frac)).toEqual([
      0.5, 0.5, 0.5,
    ]);
    expect(v.kpoints).toEqual({
      scheme: "Gamma",
      divisions: [2, 2, 2],
      kpoints: [[0, 0, 0]],
      weights: [1],
    });
    const step = v.ionicSteps[0]!;
    expect(step.energy).toEqual({
      free: -5.5,
      withoutEntropy: -5.4,
      sigma0: -5.45,
    });
    expect(step.electronicSteps).toBe(3);
  });

  it("converts stress from VASP's -kBar to eV/Å³ and reads overflow fields as NaN", () => {
    const step = parseVasprun(vasprun()).ionicSteps[0]!;
    // -10 kBar in VASP's convention = +1 GPa tensile = 1/160.21766208 eV/Å³.
    expect(step.stress![0]![0]).toBeCloseTo(1 / 160.21766208, 12);
    expect(step.stress![0]![1]).toBe(0);
    expect(step.forces![0]).toEqual([0.1, 0, 0]);
    expect(step.forces![1]![0]).toBeNaN();
  });

  it("does not let 'response functions' duplicates override parameters", () => {
    const v = parseVasprun(
      vasprun({
        params: `<separator name="electronic"><i type="int" name="NELM"> 60 </i></separator>
                 <separator name="response functions"><i type="int" name="NELM"> 1 </i><i type="int" name="NOMEGA"> 4 </i></separator>`,
      }),
    );
    expect(v.parameters.NELM).toBe(60);
    expect(v.parameters.NOMEGA).toBe(4);
  });

  it("takes the electronic structure from the last DOS block", () => {
    const v = parseVasprun(
      vasprun({ calcs: [{ dos: [1.0] }, { dos: [2.0, 3.0] }] }),
    );
    expect(v.efermi).toBe(3);
    expect(v.dos!.total).toEqual([[0, 2]]);
    expect(v.dos!.integrated).toEqual([[0, 1]]);
    expect(v.eigenvalues!.energies).toEqual([[[-3, 2]]]);
    expect(v.eigenvalues!.occupations).toEqual([[[1, 0]]]);
  });

  it("can skip eigenvalues and DOS", () => {
    const v = parseVasprun(vasprun(), { eigenvalues: false, dos: false });
    expect(v.eigenvalues).toBeNull();
    expect(v.dos).toBeNull();
    expect(v.efermi).toBe(1.5); // still read: it is cheap and widely needed
  });

  it("judges convergence as pymatgen does", () => {
    const run = (incar: string, params: string, calcs: Calc[]) =>
      parseVasprun(vasprun({ incar, params, calcs })).converged;
    const nelm = (n: number) => `<i type="int" name="NELM"> ${n} </i>`;
    // Electronic: fewer SCF steps than NELM in the final ionic step.
    expect(run("", nelm(5), [{ scsteps: 4 }]).electronic).toBe(true);
    expect(run("", nelm(5), [{ scsteps: 5 }]).electronic).toBe(false);
    // Relaxation: stopped before NSW.
    const relax = `<i type="int" name="IBRION"> 2 </i><i type="int" name="NSW"> 3 </i>`;
    expect(run("", nelm(60) + relax, [{}, {}]).ionic).toBe(true);
    expect(run("", nelm(60) + relax, [{}, {}, {}]).ionic).toBe(false);
    // MD (IBRION = 0): converged when all NSW steps ran.
    const md = `<i type="int" name="IBRION"> 0 </i><i type="int" name="NSW"> 2 </i>`;
    expect(run("", nelm(60) + md, [{}, {}]).ionic).toBe(true);
    expect(run("", nelm(60) + md, [{}]).ionic).toBe(false);
    // Relaxation with EDIFFG = 0 deliberately runs NSW steps.
    const ediffg0 = relax + `<i name="EDIFFG"> 0.0 </i>`;
    expect(run("", nelm(60) + ediffg0, [{}, {}, {}]).ionic).toBe(true);
  });

  it("falls back to the ionic steps when initial/final structures are missing", () => {
    const v = parseVasprun(vasprun({ final: false }));
    expect(v.finalStructure).toBe(v.ionicSteps.at(-1)!.structure);
  });

  it("rejects input that is not vasprun.xml", () => {
    expect(() => parseVasprun("<root/>")).toThrow(/modeling/);
  });
});
