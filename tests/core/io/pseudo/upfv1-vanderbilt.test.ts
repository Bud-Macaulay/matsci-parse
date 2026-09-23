import { describe, it, expect } from "vitest";

import { fromUPFv1 } from "@/core/io/pseudo/upf-v1";
import { validate } from "@/core/pseudopotential/validate";

/**
 * Synthetic Vanderbilt `uspp`-converter UPF v1 file (SSSP-style):
 * no version preamble, labeled header, PP_QIJ augmentation with
 * (index, value) PP_RINNER pairs, per-group PP_QFCOEF blocks, and
 * labeled PSWFC headers.
 */
const vanderbiltV1 = [
  "<PP_INFO>",
  "Vanderbilt test file",
  "</PP_INFO>",
  "<PP_HEADER>",
  "  0                   Version Number",
  "  Xx                  Element",
  "  US                  Ultrasoft pseudopotential",
  "  T                   Nonlinear Core Correction",
  "  SLA PW PBE          Exchange-Correlation functional",
  "  4.00000000000       Z valence",
  "  -20.00000000000     Total energy",
  "  30.00000    60.00000 Suggested cutoff for wfc and rho",
  "  1                   Max angular momentum component",
  "  5                   Number of points in mesh",
  "  1    2              Number of Wavefunctions, Number of Projectors",
  "  Wavefunctions       nl  l   occ",
  "                      2S  0  2.00",
  "</PP_HEADER>",
  "<PP_MESH>",
  "<PP_R>",
  "0.01 0.02 0.03 0.04 0.05",
  "</PP_R>",
  "<PP_RAB>",
  "0.01 0.01 0.01 0.01 0.01",
  "</PP_RAB>",
  "</PP_MESH>",
  "<PP_NLCC>",
  "0.1 0.1 0.1 0.1 0.1",
  "</PP_NLCC>",
  "<PP_LOCAL>",
  "-1.0 -0.9 -0.8 -0.7 -0.6",
  "</PP_LOCAL>",
  "<PP_NONLOCAL>",
  "<PP_BETA>",
  "    1    0             Beta    L",
  "    5",
  "0.1 0.2 0.3 0.4 0.5",
  "</PP_BETA>",
  "<PP_BETA>",
  "    2    1             Beta    L",
  "    5",
  "0.2 0.3 0.4 0.5 0.6",
  "</PP_BETA>",
  "<PP_DIJ>",
  "    2                  Number of nonzero Dij",
  "    1    1 0.5",
  "    2    2 0.6",
  "</PP_DIJ>",
  "<PP_QIJ>",
  "    2     nqf for this test",
  "    <PP_RINNER>",
  "    1  1.10000000000E+00",
  "    2  1.20000000000E+00",
  "    </PP_RINNER>",
  "    1    1    0        i  j  (l(j))",
  " -1.42866759186E-01    Q_int",
  "0.01 0.02 0.03 0.04 0.05",
  "    <PP_QFCOEF>",
  " -7.45298770267E+00  3.38841499019E+01",
  "    </PP_QFCOEF>",
  "    2    2    1        i  j  (l(j))",
  " -2.00000000000E-01    Q_int",
  "0.02 0.03 0.04 0.05 0.06",
  "    <PP_QFCOEF>",
  " -3.62030029277E-01  3.20734510538E+00",
  "    </PP_QFCOEF>",
  "</PP_QIJ>",
  "</PP_NONLOCAL>",
  "<PP_PSWFC>",
  "2S    0  2.00          Wavefunction",
  "0.01 0.02 0.03 0.04 0.05",
  "</PP_PSWFC>",
  "<PP_RHOATOM>",
  "0.2 0.2 0.2 0.2 0.2",
  "</PP_RHOATOM>",
].join("\n");

describe("UPF v1 Vanderbilt dialect (SSSP uspp)", () => {
  it("parses without a version preamble", () => {
    const pp = fromUPFv1(vanderbiltV1);
    expect(pp.format).toBe("UPF1");
    expect(pp.version).toBe("1.0.0");
  });

  it("parses the labeled header", () => {
    const pp = fromUPFv1(vanderbiltV1);
    expect(pp.header.element).toBe("Xx");
    expect(pp.header.pseudoType).toBe("US");
    expect(pp.header.isUltrasoft).toBe(true);
    expect(pp.header.coreCorrection).toBe(true);
    expect(pp.header.functional).toBe("SLA PW PBE");
    expect(pp.header.zValence).toBeCloseTo(4.0);
    expect(pp.header.totalPsenergy).toBeCloseTo(-20.0);
    expect(pp.header.wfcCutoff).toBeCloseTo(30.0);
    expect(pp.header.rhoCutoff).toBeCloseTo(60.0);
    expect(pp.header.lMax).toBe(1);
    expect(pp.header.meshSize).toBe(5);
    expect(pp.header.numberOfWfc).toBe(1);
    expect(pp.header.numberOfProj).toBe(2);
    expect(pp.header.hasWfc).toBe(true);
  });

  it("parses mesh, potentials and densities", () => {
    const pp = fromUPFv1(vanderbiltV1);
    expect(pp.mesh.r.length).toBe(5);
    expect(pp.local.vloc.length).toBe(5);
    expect(pp.nlcc!.length).toBe(5);
    expect(pp.rhoatom.length).toBe(5);
  });

  it("parses beta projectors and skips the Dij count line", () => {
    const pp = fromUPFv1(vanderbiltV1);
    expect(pp.nonlocal.betas.length).toBe(2);
    expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
    expect(pp.nonlocal.betas[0].label).toBe("Beta 1");
    expect(pp.nonlocal.betas[0].cutoffRadiusIndex).toBe(5);
    expect(Array.from(pp.nonlocal.betas[0].beta)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(pp.nonlocal.dij).toEqual([
      [1, 1, 0.5],
      [2, 2, 0.6],
    ]);
  });

  it("parses labeled wavefunctions", () => {
    const pp = fromUPFv1(vanderbiltV1);
    expect(pp.pswfc.length).toBe(1);
    expect(pp.pswfc[0].label).toBe("2S");
    expect(pp.pswfc[0].l).toBe(0);
    expect(pp.pswfc[0].occupation).toBeCloseTo(2.0);
  });

  it("parses PP_QIJ augmentation", () => {
    const pp = fromUPFv1(vanderbiltV1);
    const aug = pp.nonlocal.augmentation!;
    expect(aug.nqf).toBe(2);
    expect(pp.nonlocal.nqf).toBe(2);
    expect(Array.from(aug.rinner!)).toEqual([1.1, 1.2]);
    expect(aug.qijl!.length).toBe(2);
    expect(aug.qijl![0]).toMatchObject({ i: 1, j: 1, l: 0 });
    expect(Array.from(aug.qijl![0].qijl)).toEqual([0.01, 0.02, 0.03, 0.04, 0.05]);
    expect(aug.qijl![1]).toMatchObject({ i: 2, j: 2, l: 1 });
    expect(Array.from(aug.q!)).toEqual([-0.142866759186, -0.2]);
    expect(aug.qfcoeff!.length).toBe(4);
  });

  it("validates cleanly", () => {
    expect(validate(fromUPFv1(vanderbiltV1))).toEqual([]);
  });
});
