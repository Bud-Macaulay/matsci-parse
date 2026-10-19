import { describe, expect, it } from "vitest";

import {
  alatFromPWOutput,
  fromMatdynModes,
  fromPhononVis,
  fromQEPhonon,
  parseMatdynModes,
  toPhononVis,
} from "@/core/io/phonon";
import { alatFromPW, fromPW } from "@/core/io/pw";
import { modeEigenvector, qpoint } from "@/core/phonon";
import { aluminumModes, aluminumPw, bnModes, bnPw } from "./teststrings/phonon";

describe("parseMatdynModes", () => {
  it("reads q-points, frequencies and eigenvectors", () => {
    const m = parseMatdynModes(aluminumModes);
    expect(m.nqpts).toBe(4);
    expect(m.nmodes).toBe(3);
    expect(Array.from(m.qpoints.subarray(3, 6))).toEqual([-1, 0, 0]);
    expect(Array.from(m.frequencies.subarray(3, 6))).toEqual([230.979303, 230.979303, 382.932788]);
    // X point, mode 3 (longitudinal): displacement along x
    expect(Array.from(m.eigenvectors.subarray(3 * 6 + 2 * 6, 3 * 6 + 3 * 6))).toEqual([1, 0, 0, 0, 0, 0]);
  });

  it("accepts the older 'omega' frequency lines", () => {
    const m = parseMatdynModes(aluminumModes.replace(/freq \(/g, "omega("));
    expect(m.frequencies[5]).toBe(382.932788);
  });

  it("rejects truncated files", () => {
    expect(() => parseMatdynModes("nothing here")).toThrow(/q =/);
    const truncated = aluminumModes.slice(0, aluminumModes.lastIndexOf("freq"));
    expect(() => parseMatdynModes(truncated)).toThrow(/expected 3 modes/);
  });
});

describe("fromQEPhonon", () => {
  it("converts q-points to fractional coordinates using alat from the input", () => {
    const bands = fromQEPhonon({ pwInput: aluminumPw, matdynModes: aluminumModes, connect: false });
    expect(qpoint(bands, 1)).toEqual([0.5, 0, 0.5].map((x) => expect.closeTo(x, 12)));
    expect(qpoint(bands, 2)).toEqual([1, 1, 1].map((x) => expect.closeTo(x, 12)));
    expect(qpoint(bands, 3)).toEqual([0.5, 0.5, 0.5].map((x) => expect.closeTo(x, 12)));
  });

  it("derives alat = |a1| for ibrav=0 cells, matching pw.x", () => {
    // pw.x output: "lattice parameter (alat) = 4.7419 a.u."
    expect(alatFromPW(bnPw)).toBeCloseTo(4.7419, 4);
    const bands = fromQEPhonon({ pwInput: bnPw, matdynModes: bnModes });
    // M = (1/2, 0, 0) to the 4 decimals matdyn.x writes
    expect(qpoint(bands, 2)[0]).toBeCloseTo(0.5, 4);
    expect(qpoint(bands, 3).slice(0, 2)).toEqual([expect.closeTo(1 / 3, 3), expect.closeTo(1 / 3, 3)]);
  });

  /** The relevant lines of a pw.x output for the aluminum fixture. */
  const alOut = (alat = "7.4305", a1 = "-0.500000   0.000000   0.500000", nat = 1) => `
     lattice parameter (alat)  =       ${alat}  a.u.
     number of atoms/cell      =            ${nat}
     crystal axes: (cart. coord. in units of alat)
               a(1) = (  ${a1} )
               a(2) = (   0.000000   0.500000   0.500000 )
               a(3) = (  -0.500000   0.500000   0.000000 )
`;

  it("reads alat from the pw.x output when given", () => {
    expect(alatFromPWOutput(alOut())).toBe(7.4305);
    expect(alatFromPWOutput(alOut(), fromPW(aluminumPw))).toBe(7.4305);
    expect(() => alatFromPWOutput(alOut() + alOut())).toThrow(/vc-relax/);
  });

  it("rejects a pw.x output from a different calculation", () => {
    const al = fromPW(aluminumPw);
    expect(() => alatFromPWOutput(alOut("7.4305", "-0.500000   0.000000   0.500000", 2), al)).toThrow(/2/);
    // same atom count, different cell
    expect(() => alatFromPWOutput(alOut("7.4305", "-0.500000   0.100000   0.500000"), al)).toThrow(/does not match/);
    expect(() => alatFromPWOutput(alOut("7.6000"), al)).toThrow(/does not match/);
  });

  it("uses the output's alat when it differs but the cell agrees (QE 4.x)", () => {
    // Same cell written with alat doubled and axes halved: as QE 4.x would
    // for an ibrav=0 input whose alat differs from the QE ≥ 5 rule.
    const out = alOut("14.8610", "-0.250000   0.000000   0.250000")
      .replace("0.000000   0.500000   0.500000", "0.000000   0.250000   0.250000")
      .replace("-0.500000   0.500000   0.000000", "-0.250000   0.250000   0.000000");
    expect(alatFromPWOutput(out, fromPW(aluminumPw))).toBe(14.861);
    const bands = fromQEPhonon({ pwInput: aluminumPw, matdynModes: aluminumModes, pwOutput: out, connect: false });
    // the file's q-points are read in 2π/alat with the doubled alat, so the
    // q written as X under the QE ≥ 5 alat lands at half of X
    expect(qpoint(bands, 1)).toEqual([0.25, 0, 0.25].map((x) => expect.closeTo(x, 4)));
  });

  it("rejects a structure that does not match the modes file", () => {
    expect(() => fromMatdynModes(bnModes, fromPW(aluminumPw), { alat: 7.43 })).toThrow(/1 atoms but the modes file has 2/);
  });

  it("labels path corners generically unless labels are given", () => {
    const auto = fromQEPhonon({ pwInput: aluminumPw, matdynModes: aluminumModes });
    expect(auto.labels.map((l) => l.label)).toEqual(["Q_1", "Q_2", "Q_3", "Q_4"]);
    const labels = [{ index: 0, label: "Γ" }, { index: 3, label: "L" }];
    expect(fromQEPhonon({ pwInput: aluminumPw, matdynModes: aluminumModes, labels }).labels).toEqual(labels);
  });
});

describe("PhononVis JSON", () => {
  const bands = fromQEPhonon({
    pwInput: bnPw,
    matdynModes: bnModes,
    labels: [{ index: 0, label: "Γ" }, { index: 2, label: "M" }],
  });

  it("writes the fields the visualizer reads", () => {
    const vis = toPhononVis(bands);
    expect(vis.name).toBe("BN");
    expect(vis.natoms).toBe(2);
    expect(vis.atom_numbers).toEqual([5, 7]);
    expect(vis.repetitions).toEqual([5, 5, 1]);
    expect(vis.highsym_qpts).toEqual([[0, "Γ"], [2, "M"]]);
    expect(vis.eigenvalues).toHaveLength(4);
    expect(vis.vectors[0][3].flat(2)).toEqual(modeEigenvector(bands, 0, 3).flat(2).map((x) => x + 0));
    expect(vis.atom_pos_car[0]).toEqual([0, expect.closeTo(1.4487451335, 9), expect.closeTo(10, 9)]);
    expect(vis.distances[0]).toBe(0);
    expect(vis.distances[3]).toBeGreaterThan(vis.distances[2]);
  });

  it("round-trips, including path breaks", () => {
    const broken = { ...bands, labels: [{ index: 1, label: "A" }, { index: 2, label: "B" }] };
    const vis = toPhononVis(broken);
    expect(vis.highsym_qpts).toEqual([[1, "A|B"]]);
    expect(vis.distances[2]).toBe(vis.distances[1]);

    const back = fromPhononVis(JSON.stringify(vis));
    expect(back.labels).toEqual(broken.labels);
    // the writer normalizes -0 to 0, as phonon-web-tools does
    const unsigned = (a: Float64Array) => Array.from(a, (x) => x + 0);
    expect(unsigned(back.eigenvectors)).toEqual(unsigned(bands.eigenvectors));
    expect(unsigned(back.frequencies)).toEqual(unsigned(bands.frequencies));
    expect(toPhononVis(back)).toEqual(vis);
  });

  it("rejects documents missing required fields", () => {
    expect(() => fromPhononVis({ ...toPhononVis(bands), vectors: undefined } as never)).toThrow(/vectors/);
  });
});
