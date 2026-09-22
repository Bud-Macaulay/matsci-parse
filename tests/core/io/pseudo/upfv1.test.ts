import { describe, it, expect } from "vitest";

import { fromUPFv1, toUPFv1 } from "@/core/io/pseudo/upf-v1";
import { fromUPF } from "@/core/io/pseudo/upf";

import { heNcUpf, oPawUpf } from "./teststrings/upf";

describe("UPF v1 parser", () => {
  describe("error handling", () => {
    it("throws on non-version first line", () => {
      expect(() => fromUPFv1("not a version number")).toThrow("Not a UPF v1 file");
    });

    it("throws on missing PP_HEADER", () => {
      expect(() => fromUPFv1("0\nno header here")).toThrow("Missing PP_HEADER");
    });

    it("throws on empty PP_R section", () => {
      const text = [
        "     0",
        "<PP_HEADER>",
        "  'H'",
        "</PP_HEADER>",
        "<PP_MESH>",
        "</PP_MESH>",
        "<PP_LOCAL>",
        "-1.0",
        "</PP_LOCAL>",
      ].join("\n");
      expect(() => fromUPFv1(text)).toThrow("Empty or missing PP_R");
    });

    it("throws on missing PP_LOCAL", () => {
      const text = [
        "     0",
        "<PP_HEADER>",
        "  'H'",
        "</PP_HEADER>",
        "<PP_MESH>",
        "<PP_R>",
        "0.01 0.02",
        "</PP_R>",
        "<PP_RAB>",
        "0.01 0.01",
        "</PP_RAB>",
        "</PP_MESH>",
      ].join("\n");
      expect(() => fromUPFv1(text)).toThrow("Missing PP_LOCAL");
    });

    it("throws on unterminated sections", () => {
      const text = [
        "     0",
        "<PP_HEADER>",
        "  'H'",
        "</PP_HEADER>",
        "<PP_MESH>",
        "<PP_R>",
        "0.01 0.02",
        "</PP_R>",
        "<PP_RAB>",
        "0.01 0.01",
        "</PP_RAB>",
        "<PP_LOCAL>",
        "-1.0 -0.9",
        "</PP_LOCAL>",
      ].join("\n");
      expect(() => fromUPFv1(text)).toThrow("Empty or missing PP_R");
    });
  });

  describe("legacy hand-written US file", () => {
    // Exercises the legacy header heuristics: equals-form counters,
    // quoted type/functional lines, core-correction flag and NLCC.
    const legacyUsV1 = [
      "     1",
      "<PP_HEADER>",
      "  'U'",
      "  'US'",
      "  .true.          nlcc",
      "  'SLA PW PBE'          dft",
      "  2.00000000          zp",
      "  -10.00000000          etotps",
      "  30.00   120.00          ecutwfc,ecutrho",
      "  lmax = 1",
      "  mesh = 5",
      "  1   1   nwfc nbeta",
      "  '1S'  0  2.0",
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
      "    1    0  '1S'",
      "    5",
      "0.1 0.2 0.3 0.4 0.5",
      "</PP_BETA>",
      "<PP_DIJ>",
      "  1  1  0.5",
      "</PP_DIJ>",
      "</PP_NONLOCAL>",
      "<PP_PSWFC>",
      "# legacy comment lines are skipped",
      "  '1S'  0  2.0",
      "0.01 0.02 0.03 0.04 0.05",
      "</PP_PSWFC>",
      "<PP_RHOATOM>",
      "0.2 0.2 0.2 0.2 0.2",
      "</PP_RHOATOM>",
    ].join("\n");

    it("parses legacy header heuristics", () => {
      const pp = fromUPFv1(legacyUsV1);
      expect(pp.format).toBe("UPF1");
      expect(pp.version).toBe("1.0.0");
      expect(pp.header.element).toBe("U");
      expect(pp.header.pseudoType).toBe("US");
      expect(pp.header.isUltrasoft).toBe(true);
      expect(pp.header.coreCorrection).toBe(true);
      expect(pp.header.functional).toBe("SLA PW PBE");
      expect(pp.header.zValence).toBeCloseTo(2.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.meshSize).toBe(5);
      expect(pp.header.numberOfWfc).toBe(1);
      expect(pp.header.numberOfProj).toBe(1);
      expect(pp.header.hasWfc).toBe(true);
    });

    it("parses mesh, local, NLCC and beta projectors", () => {
      const pp = fromUPFv1(legacyUsV1);
      expect(pp.mesh.r.length).toBe(5);
      expect(pp.local.vloc.length).toBe(5);
      expect(pp.nlcc!.length).toBe(5);
      expect(pp.nonlocal.betas.length).toBe(1);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[0].label).toBe("1S");
      expect(pp.nonlocal.betas[0].cutoffRadiusIndex).toBe(5);
      expect(Array.from(pp.nonlocal.betas[0].beta)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(pp.nonlocal.dij).toEqual([[1, 1, 0.5]]);
      expect(pp.pswfc.length).toBe(1);
      expect(pp.pswfc[0].label).toBe("1S");
      expect(pp.rhoatom.length).toBe(5);
    });

    it("detects PAW type lines", () => {
      const pp = fromUPFv1(legacyUsV1.replace("  'US'", "  'PAW'"));
      expect(pp.header.pseudoType).toBe("PAW");
      expect(pp.header.isPaw).toBe(true);
    });
  });

  describe("UPF2-sourced round trip", () => {
    it("preserves He NC tabulated data", () => {
      const a = fromUPF(heNcUpf);
      const b = fromUPFv1(toUPFv1(a));
      expect(b.header.element).toBe("He");
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.pswfc.length).toBe(a.pswfc.length);
    });

    it("preserves NLCC through the legacy text", () => {
      const a = fromUPF(oPawUpf);
      const b = fromUPFv1(toUPFv1(a));
      expect(b.nlcc).toBeDefined();
      expect(b.nlcc!.length).toBe(a.nlcc!.length);
      for (let i = 0; i < a.nlcc!.length; i += 100) {
        expect(b.nlcc![i]).toBeCloseTo(a.nlcc![i], 10);
      }
    });
  });
});
