import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  fromPhonopyBandYaml,
  parsePhonopyBandYaml,
  toPhonopyBandYaml,
} from "@/core/io/phonon";
import {
  createPhononBands,
  modeEigenvector,
  pathBreaks,
  qpoint,
  qpointDistances,
  type PhononBands,
} from "@/core/phonon";
import { cuFCCPrimitive } from "../../fixtures/structures";

/*
 * Fixtures in tests/fixtures/phonopy/:
 * - NaCl_band.yaml: phonopy 2.43.1, `phonopy -c POSCAR NaCl_band.conf`
 *   (PRIMITIVE_AXES = FCC, EIGENVECTORS, a path break K | L), using the
 *   NaCl POSCAR and FORCE_CONSTANTS from pymatgen's test files.
 * - NaCl_band_auto.yaml: same, `NaCl_band_auto.conf` (BAND = AUTO via
 *   seekpath: LaTeX labels, no eigenvectors).
 * - NaCl_band_legacy.yaml: pymatgen's NaCl_band.yaml (phonopy 1.11.2:
 *   per-q-point `label:`, `supercell_matrix`), trimmed to segment ends.
 */
const fixture = (name: string) =>
  readFileSync(new URL(`../../fixtures/phonopy/${name}`, import.meta.url), "utf-8");
const nacl = fixture("NaCl_band.yaml");
const naclAuto = fixture("NaCl_band_auto.yaml");
const naclLegacy = fixture("NaCl_band_legacy.yaml");

const THZ = 33.3564095198152; // cm⁻¹ per THz

describe("parsePhonopyBandYaml", () => {
  it("reads the header, frequencies (THz) and eigenvectors", () => {
    const raw = parsePhonopyBandYaml(nacl);
    expect(raw.nqpts).toBe(9);
    expect(raw.natoms).toBe(2);
    expect(raw.segmentNqpts).toEqual([3, 3, 3]);
    expect(raw.segmentLabels).toEqual([
      ["$\\Gamma$", "X"],
      ["X", "K"],
      ["L", "$\\Gamma$"],
    ]);
    expect(raw.symbols).toEqual(["Na", "Cl"]);
    expect(raw.masses).toEqual([22.989769, 35.453]);
    expect(raw.lattice.slice(0, 3)).toEqual([0, 2.845150738087836, 2.845150738087836]);
    expect(raw.positions).toEqual([0, 0, 0, 0.5, 0.5, 0.5]);
    expect(raw.lengthUnit).toBeNull();
    expect(Array.from(raw.qpoints.subarray(12, 15))).toEqual([0.4375, 0.1875, 0.625]);
    expect(raw.distances[8]).toBe(0.4668636);
    expect(Array.from(raw.frequencies.subarray(12, 18))).toEqual([
      2.4808506659, 2.4808506659, 4.1302761245, 4.8564870551, 4.8564870551, 5.185245292,
    ]);
    // q-point 3 (X), mode 6: atom 1 [y], then atom 2 [y]
    const o = (2 * 6 + 5) * 12;
    expect(Array.from(raw.eigenvectors!.subarray(o, o + 12))).toEqual([
      -0, 0, -0.63683864761222, 0, -0, 0, 0, 0, -0.77099710564142, 0, 0, -0,
    ]);
  });

  it("returns null eigenvectors when the file has none", () => {
    const raw = parsePhonopyBandYaml(naclAuto);
    expect(raw.eigenvectors).toBeNull();
    expect(raw.nqpts).toBe(18);
    expect(raw.segmentNqpts).toEqual([3, 3, 3, 3, 3, 3]);
    expect(raw.frequencies[5]).toBe(4.6233235237);
  });

  it("reads per-q-point labels and skips unknown keys (phonopy 1.x)", () => {
    const raw = parsePhonopyBandYaml(naclLegacy);
    expect(raw.segmentLabels).toBeNull();
    expect(raw.qpointLabels.map((l) => `${l.index}:${l.label}`)).toEqual([
      "0:Gamma", "2:X", "3:X", "5:Y", "6:Y", "8:Gamma", "9:Gamma", "11:Z",
    ]);
  });

  it("rejects malformed files", () => {
    expect(() => parsePhonopyBandYaml("nqpoint: 1\n")).toThrow(/phonon:/);
    expect(() => parsePhonopyBandYaml(nacl.replace("nqpoint: 9", "nqpoint: 10"))).toThrow(
      /nqpoint: 10 but contains 9/,
    );
    expect(() => parsePhonopyBandYaml(nacl.replace("- 3\n- 3\n- 3", "- 3\n- 3\n- 2"))).toThrow(
      /segment_nqpoint/,
    );
    expect(() => parsePhonopyBandYaml(nacl.replace("- [ 'X', 'K' ]\n", ""))).toThrow(/2 label pairs/);
    expect(() => parsePhonopyBandYaml(nacl.replace("natom: 2", "natom: 3"))).toThrow(/natom: 3/);
    // a missing mode
    const lastMode = nacl.lastIndexOf("  - # 6");
    expect(() => parsePhonopyBandYaml(nacl.slice(0, lastMode))).toThrow(/expected 6 modes, found 5/);
    // a missing eigenvector row
    const lastRow = nacl.lastIndexOf("      - [");
    expect(() => parsePhonopyBandYaml(nacl.slice(0, lastRow))).toThrow(/expected 6 eigenvector rows, got 5/);
    expect(() => parsePhonopyBandYaml(nacl.replace("frequency:   -0.0282638794", "frequency: abc"))).toThrow(
      /cannot parse number 'abc'/,
    );
  });
});

describe("fromPhonopyBandYaml", () => {
  const bands = fromPhonopyBandYaml(nacl);

  it("uses the primitive cell the q-points refer to", () => {
    expect(bands.structure.sites.length).toBe(2);
    expect(Array.from(bands.structure.lattice.basis.data.subarray(0, 3))).toEqual([
      0, 2.845150738087836, 2.845150738087836,
    ]);
    expect(bands.structure.sites[1].properties).toEqual({ mass: 35.453 });
    expect(qpoint(bands, 2)).toEqual([0.5, 0, 0.5]);
    // phonopy's distances follow from these q-points and lattice
    const raw = parsePhonopyBandYaml(nacl);
    Array.from(qpointDistances(bands)).forEach((d, q) => expect(d).toBeCloseTo(raw.distances[q], 6));
  });

  it("converts frequencies from THz to cm⁻¹", () => {
    expect(bands.nmodes).toBe(6);
    expect(bands.frequencies[5]).toBeCloseTo(4.6233235237 * THZ, 9);
    expect(bands.frequencies[5]).toBeCloseTo(154.2175, 3);
    // the acoustic modes at Γ stay (slightly) imaginary
    expect(bands.frequencies[0]).toBeLessThan(0);
  });

  it("keeps the eigenvectors as written", () => {
    expect(modeEigenvector(bands, 2, 5)).toEqual([
      [[-0, 0], [-0.63683864761222, 0], [-0, 0]],
      [[0, 0], [-0.77099710564142, 0], [0, -0]],
    ]);
  });

  it("maps segment labels to joints and breaks", () => {
    expect(bands.labels).toEqual([
      { index: 0, label: "Γ" },
      { index: 2, label: "X" },
      { index: 3, label: "X" },
      { index: 5, label: "K" },
      { index: 6, label: "L" },
      { index: 8, label: "Γ" },
    ]);
    expect(pathBreaks(bands)).toEqual([5]);
  });

  it("fills zero eigenvectors and converts LaTeX labels without them", () => {
    const auto = fromPhonopyBandYaml(naclAuto);
    expect(auto.eigenvectors.length).toBe(18 * 6 * 6 * 2);
    expect(auto.eigenvectors.every((x) => x === 0)).toBe(true);
    expect(auto.labels.map((l) => l.label).join(" ")).toBe("Γ X X U K Γ Γ L L W W X");
    expect(pathBreaks(auto)).toEqual([5]);
  });

  it("reads per-q-point labels of phonopy 1.x", () => {
    const legacy = fromPhonopyBandYaml(naclLegacy);
    expect(legacy.labels.map((l) => l.label).join(" ")).toBe("Γ X X Y Y Γ Γ Z");
    expect(pathBreaks(legacy)).toEqual([]);
  });

  it("names segment ends by q-point when the file has no labels", () => {
    const unlabelled = fromPhonopyBandYaml(nacl.replace(/labels:\n(- \[.*\n)+/, ""));
    expect(unlabelled.labels.map((l) => `${l.index}:${l.label}`)).toEqual([
      "0:Q_1", "2:Q_2", "3:Q_2", "5:Q_3", "6:Q_4", "8:Q_1",
    ]);
    expect(pathBreaks(unlabelled)).toEqual([5]);
  });

  it("converts a Bohr lattice (length_unit: au) to Å", () => {
    const bohr = 0.529177210903;
    const lat = (x: number) => (x / bohr).toFixed(15).padStart(21);
    const text = nacl.replace(
      /^lattice:\n(.*\n){3}/m,
      "lattice:\n" +
        [[0, 1, 1], [1, 0, 1], [1, 1, 0]]
          .map((r) => `- [ ${r.map((x) => lat(x * 2.845150738087836)).join(", ")} ]\n`)
          .join(""),
    );
    const au = fromPhonopyBandYaml("calculator: qe\nlength_unit: au\n" + text);
    expect(parsePhonopyBandYaml("calculator: qe\nlength_unit: au\n" + text).calculator).toBe("qe");
    // to the precision of LengthUnitSystem's Bohr (0.529177 Å)
    expect(au.structure.lattice.basis.data[1]).toBeCloseTo(2.845150738087836, 5);
    expect(fromPhonopyBandYaml(text, { lengthUnit: "au" }).structure.lattice.basis.data[1]).toBeCloseTo(
      2.845150738087836,
      5,
    );
  });
});

describe("toPhonopyBandYaml", () => {
  it("reproduces phonopy's own file", () => {
    const written = toPhonopyBandYaml(fromPhonopyBandYaml(nacl));
    // identical but for labels, which are read as plain text
    expect(written).toBe(nacl.replaceAll("'$\\Gamma$'", "'Γ'"));
  });

  it("reproduces a file without eigenvectors", () => {
    const written = toPhonopyBandYaml(fromPhonopyBandYaml(naclAuto));
    expect(written).toBe(naclAuto.replace(/'\$(?:\\mathrm\{)?\\?(\w+)\}?\$'/g, (_, l) => `'${l === "Gamma" ? "Γ" : l}'`));
  });

  it("round-trips losslessly", () => {
    for (const text of [nacl, naclAuto, naclLegacy]) {
      const once = fromPhonopyBandYaml(text);
      const twice = fromPhonopyBandYaml(toPhonopyBandYaml(once));
      expectSameBands(twice, once);
      expect(toPhonopyBandYaml(twice)).toBe(toPhonopyBandYaml(once));
    }
  });

  it("writes a labelled corner twice, as end and start of two segments", () => {
    const bands = createPhononBands({
      structure: cuFCCPrimitive,
      qpoints: [0, 0, 0, 0.25, 0, 0.25, 0.5, 0, 0.5, 0.5, 0.25, 0.5, 0.5, 0.5, 0.5],
      frequencies: Array.from({ length: 15 }, (_, k) => 10 * k),
      eigenvectors: new Float64Array(5 * 3 * 3 * 2).fill(0.5),
      labels: [
        { index: 0, label: "Γ" },
        { index: 2, label: "X" },
        { index: 4, label: "L" },
      ],
    });
    const text = toPhonopyBandYaml(bands);
    expect(text).toMatch(/^nqpoint: 6 {6}\nnpath: 2 {6}\nsegment_nqpoint:\n- 3\n- 3\nlabels:\n- \[ 'Γ', 'X' \]\n- \[ 'X', 'L' \]\n/);
    // no masses on the fixture: taken from the periodic table
    expect(text).toContain("  mass: 63.546000\n");
    const back = fromPhonopyBandYaml(text);
    expect(back.nqpts).toBe(6);
    expect(qpoint(back, 3)).toEqual([0.5, 0, 0.5]);
    expect(back.labels.map((l) => `${l.index}:${l.label}`)).toEqual(["0:Γ", "2:X", "3:X", "5:L"]);
    expect(Array.from(qpointDistances(back))).toEqual(
      [0, 1, 2, 2, 3, 4].map((q) => expect.closeTo(qpointDistances(bands)[q], 7)),
    );
    expect(back.frequencies[3 * 3]).toBeCloseTo(60, 8);
  });

  it("writes one segment and no labels for an unlabelled path", () => {
    const bands = createPhononBands({
      structure: cuFCCPrimitive,
      qpoints: [0, 0, 0, 0.5, 0, 0.5],
      frequencies: [0, 0, 0, 100, 100, 200],
      eigenvectors: new Float64Array(2 * 3 * 3 * 2),
    });
    const text = toPhonopyBandYaml(bands);
    expect(text).toContain("npath: 1      \nsegment_nqpoint:\n- 2\nreciprocal_lattice:");
    expect(text).not.toContain("eigenvector");
    expect(toPhonopyBandYaml(bands, { eigenvectors: true })).toContain("    eigenvector:\n    - # atom 1\n");
    expect(fromPhonopyBandYaml(text).labels).toEqual([]);
  });
});

function expectSameBands(actual: PhononBands, expected: PhononBands) {
  expect(actual.nqpts).toBe(expected.nqpts);
  expect(actual.labels).toEqual(expected.labels);
  expect(Array.from(actual.structure.lattice.basis.data)).toEqual(Array.from(expected.structure.lattice.basis.data));
  expect(actual.structure.sites).toEqual(expected.structure.sites);
  expect(Array.from(actual.qpoints)).toEqual(Array.from(expected.qpoints));
  expect(Array.from(actual.eigenvectors)).toEqual(Array.from(expected.eigenvectors));
  // THz → cm⁻¹ → THz: equal to the 10 decimals written
  Array.from(actual.frequencies).forEach((x, k) =>
    expect(x / THZ).toBeCloseTo(expected.frequencies[k] / THZ, 10),
  );
}
