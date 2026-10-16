import { describe, expect, it } from "vitest";

import { fromPWXML } from "@/core/io/pw";
import { EnergyUnitSystem } from "@/core/units/energy";
import { LengthUnitSystem } from "@/core/units/length";

const HA = EnergyUnitSystem.convert(1, "Hartree", "eV");
const BOHR = LengthUnitSystem.convert(1, "bohr", "angstrom");

/** A minimal, hand-written pw.x XML output (Hartree atomic units). */
function xml({ lsda = true, twoFermi = false, withOutput = true } = {}): string {
  const cell = `<cell><a1>10 0 0</a1><a2>0 10 0</a2><a3>0 0 10</a3></cell>`;
  const structure = (x: number) => `
    <atomic_structure nat="2" alat="10.0">
      <atomic_positions>
        <atom name="Fe1" index="1">0 0 0</atom>
        <atom name="O" index="2">${x} 0 0</atom>
      </atomic_positions>
      ${cell}
    </atomic_structure>`;
  const bands = lsda
    ? `<lsda>true</lsda><noncolin>false</noncolin><nbnd_up>2</nbnd_up><nbnd_dw>2</nbnd_dw>`
    : `<lsda>false</lsda><noncolin>false</noncolin><nbnd>2</nbnd>`;
  const eig = lsda ? "-0.5 0.25 -0.4 0.3" : "-0.5 0.25";
  const occ = lsda ? "1 0.5 1 0" : "1 0.5";
  const fermi = twoFermi
    ? `<two_fermi_energies>0.1 0.2</two_fermi_energies>`
    : `<fermi_energy>0.1</fermi_energy>`;
  return `<?xml version="1.0"?>
<qes:espresso xmlns:qes="http://www.quantum-espresso.org/ns/qes/qes-1.0">
  <general_info><creator NAME="PWSCF" VERSION="7.2">x</creator></general_info>
  <input>
    <control_variables><calculation>relax</calculation></control_variables>
    ${structure(4)}
  </input>
  <step n_step="1">
    <scf_conv><convergence_achieved>false</convergence_achieved></scf_conv>
    ${structure(4.5)}
    <total_energy><etot>-10.0</etot></total_energy>
  </step>
  ${
    withOutput
      ? `<output>
    <convergence_info>
      <scf_conv><convergence_achieved>true</convergence_achieved></scf_conv>
      <opt_conv><convergence_achieved>true</convergence_achieved></opt_conv>
    </convergence_info>
    ${structure(5)}
    <basis_set><reciprocal_lattice><b1>1 0 0</b1><b2>0 1 0</b2><b3>0 0 1</b3></reciprocal_lattice></basis_set>
    <magnetization><total>2.0</total><absolute>2.5</absolute></magnetization>
    <total_energy><etot>-10.5</etot></total_energy>
    <band_structure>
      ${bands}
      <nelec>2</nelec>
      ${fermi}
      <ks_energies>
        <k_point weight="1.0">0.5 0 0</k_point>
        <eigenvalues size="${lsda ? 4 : 2}">${eig}</eigenvalues>
        <occupations size="${lsda ? 4 : 2}">${occ}</occupations>
      </ks_energies>
    </band_structure>
    <forces rank="2" dims="3 2" order="F">1 2 3 4 5 6</forces>
    <stress rank="2" dims="3 3" order="F">1 0 0 0 2 0 0 0 3</stress>
  </output>`
      : ""
  }
  <exit_status>0</exit_status>
</qes:espresso>`;
}

describe("fromPWXML", () => {
  const r = fromPWXML(xml());

  it("reads metadata, convergence and exit status", () => {
    expect(r.version).toBe("7.2");
    expect(r.calculation).toBe("relax");
    expect(r.converged).toEqual({ electronic: true, ionic: true });
    expect(r.exitStatus).toBe(0);
  });

  it("converts structures from Bohr and keeps species labels as kinds", () => {
    const s = r.finalStructure;
    expect(s.lattice.basis.data[0]).toBeCloseTo(10 * BOHR, 10);
    expect(Array.from(s.sites[1].frac)).toEqual([0.5, 0, 0]);
    expect(s.sites.map((x) => x.species.symbol)).toEqual(["Fe", "O"]);
    expect(s.sites[0].properties).toEqual({ kind: "Fe1" });
    expect(r.initialStructure.sites[1].frac[0]).toBeCloseTo(0.4, 12);
  });

  it("keeps ionic steps separate from the final output", () => {
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0].structure.sites[1].frac[0]).toBeCloseTo(0.45, 12);
    expect(r.steps[0].energy).toBeCloseTo(-10 * HA, 10);
    expect(r.steps[0].scfConverged).toBe(false);
    expect(r.steps[0].forces).toBeNull();
    expect(r.energy).toBeCloseTo(-10.5 * HA, 10);
  });

  it("converts forces to eV/Å as [site][xyz] and stress to eV/Å³", () => {
    const f = HA / BOHR;
    expect(r.forces).toEqual([
      [1 * f, 2 * f, 3 * f],
      [4 * f, 5 * f, 6 * f],
    ]);
    const s = HA / BOHR ** 3;
    expect(r.stress).toEqual([
      [1 * s, 0, 0],
      [0, 2 * s, 0],
      [0, 0, 3 * s],
    ]);
  });

  it("splits spin-polarized bands into up and down channels, in eV", () => {
    expect(r.bands!.energies).toEqual([[[-0.5 * HA, 0.25 * HA]], [[-0.4 * HA, 0.3 * HA]]]);
    expect(r.bands!.occupations).toEqual([[[1, 0.5]], [[1, 0]]]);
  });

  it("keeps a single channel without spin polarization", () => {
    const u = fromPWXML(xml({ lsda: false }));
    expect(u.bands!.energies).toEqual([[[-0.5 * HA, 0.25 * HA]]]);
  });

  it("converts k-points to fractional reciprocal coordinates with weights", () => {
    expect(r.kpoints).toEqual({
      kind: "points",
      points: [{ coordinate: [0.5, 0, 0] }],
      weights: [1],
      coordinateSystem: "reciprocal",
    });
  });

  it("reads the Fermi energy, or two when the magnetization is fixed", () => {
    expect(r.efermi).toBeCloseTo(0.1 * HA, 10);
    expect(fromPWXML(xml({ twoFermi: true })).efermi).toEqual([0.1 * HA, 0.2 * HA]);
  });

  it("reads magnetization", () => {
    expect(r.magnetization).toEqual({ total: 2, absolute: 2.5 });
  });

  it("throws for runs without an <output> section", () => {
    expect(() => fromPWXML(xml({ withOutput: false }))).toThrow(
      "pw.x XML: no <output> section",
    );
  });

  it("throws for documents that are not pw.x XML", () => {
    expect(() => fromPWXML("<root/>")).toThrow("not a qes:espresso document");
  });
});
