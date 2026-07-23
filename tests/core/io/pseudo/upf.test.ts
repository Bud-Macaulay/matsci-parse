import { describe, it, expect } from "vitest";

import { fromUPF, toUPF } from "@/core/io/pseudo/upf";

import * as fixtures from "./teststrings/upf";

describe("UPF parser", () => {
  describe("He NC (SG15 ONCVPSP)", () => {
    let pp: ReturnType<typeof fromUPF>;

    it("parses without error", () => {
      pp = fromUPF(fixtures.heNcUpf);
      expect(pp).toBeDefined();
    });

    it("parses header correctly", () => {
      expect(pp.header.element).toBe("He");
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.hasSo).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.header.zValence).toBeCloseTo(2.0);
      expect(pp.header.lMax).toBe(0);
      expect(pp.header.numberOfProj).toBe(2);
      expect(pp.header.numberOfWfc).toBe(1);
    });

    it("parses mesh with correct size", () => {
      expect(pp.mesh.r.length).toBe(728);
      expect(pp.mesh.rab.length).toBe(728);
      expect(pp.mesh.r[0]).toBeCloseTo(0);
      expect(pp.mesh.r[727]).toBeGreaterThan(pp.mesh.r[1]);
    });

    it("parses local potential", () => {
      expect(pp.local.vloc.length).toBe(728);
      expect(pp.local.vloc[0]).toBeLessThan(0);
    });

    it("parses nonlocal projectors", () => {
      expect(pp.nonlocal.betas.length).toBe(2);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[0].beta.length).toBe(728);
    });

    it("parses DIJ matrix", () => {
      expect(pp.nonlocal.dij.length).toBe(4);
      expect(pp.nonlocal.dij[0][0]).toBe(1);
      expect(pp.nonlocal.dij[0][1]).toBe(1);
    });

    it("parses wavefunctions", () => {
      expect(pp.pswfc.length).toBe(1);
      expect(pp.pswfc[0].l).toBe(0);
      expect(pp.pswfc[0].chi.length).toBe(728);
    });

    it("parses atomic charge density", () => {
      expect(pp.rhoatom.length).toBe(728);
      expect(pp.rhoatom[0]).toBeCloseTo(0);
      expect(pp.rhoatom[1]).toBeGreaterThan(0);
    });

    it("has no optional sections", () => {
      expect(pp.nlcc).toBeUndefined();
      expect(pp.semilocal).toBeUndefined();
      expect(pp.fullWfc).toBeUndefined();
      expect(pp.paw).toBeUndefined();
      expect(pp.gipaw).toBeUndefined();
    });
  });

  describe("H USPP (GBRV)", () => {
    let pp: ReturnType<typeof fromUPF>;

    it("parses without error", () => {
      pp = fromUPF(fixtures.hUsppUpf);
      expect(pp).toBeDefined();
    });

    it("parses header as ultrasoft", () => {
      expect(pp.header.element).toBe("H");
      expect(pp.header.pseudoType).toBe("US");
      expect(pp.header.isUltrasoft).toBe(true);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.header.zValence).toBeCloseTo(1.0);
      expect(pp.header.lMax).toBe(0);
      expect(pp.header.numberOfProj).toBe(2);
      expect(pp.header.numberOfWfc).toBe(1);
    });

    it("parses mesh", () => {
      expect(pp.mesh.r.length).toBe(615);
      expect(pp.mesh.rab.length).toBe(615);
    });

    it("parses local potential", () => {
      expect(pp.local.vloc.length).toBe(615);
    });

    it("parses nonlocal projectors", () => {
      expect(pp.nonlocal.betas.length).toBe(2);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[0].beta.length).toBe(615);
    });

    it("parses wavefunctions", () => {
      expect(pp.pswfc.length).toBe(1);
      expect(pp.pswfc[0].l).toBe(0);
    });

    it("parses atomic charge density", () => {
      expect(pp.rhoatom.length).toBe(615);
    });

    it("has no PAW sections", () => {
      expect(pp.paw).toBeUndefined();
      expect(pp.fullWfc).toBeUndefined();
      expect(pp.gipaw).toBeUndefined();
    });
  });

  describe("O PAW (PSLibrary)", () => {
    let pp: ReturnType<typeof fromUPF>;

    it("parses without error", () => {
      pp = fromUPF(fixtures.oPawUpf);
      expect(pp).toBeDefined();
    });

    it("parses header as PAW", () => {
      expect(pp.header.element).toBe("O");
      expect(pp.header.pseudoType).toBe("PAW");
      expect(pp.header.isUltrasoft).toBe(true);
      expect(pp.header.isPaw).toBe(true);
      expect(pp.header.hasWfc).toBe(true);
      expect(pp.header.hasGipaw).toBe(true);
      expect(pp.header.coreCorrection).toBe(true);
      expect(pp.header.zValence).toBeCloseTo(6.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.numberOfProj).toBe(4);
      expect(pp.header.numberOfWfc).toBe(2);
    });

    it("parses mesh", () => {
      expect(pp.mesh.r.length).toBe(1095);
      expect(pp.mesh.rab.length).toBe(1095);
    });

    it("parses non-linear core correction", () => {
      expect(pp.nlcc).toBeDefined();
      expect(pp.nlcc!.length).toBe(1095);
      expect(pp.nlcc![0]).toBeGreaterThanOrEqual(0);
    });

    it("parses local potential", () => {
      expect(pp.local.vloc.length).toBe(1095);
    });

    it("parses nonlocal projectors", () => {
      expect(pp.nonlocal.betas.length).toBe(4);
      for (const beta of pp.nonlocal.betas) {
        expect(beta.beta.length).toBe(1095);
        expect(beta.angularMomentum).toBeGreaterThanOrEqual(0);
      }
    });

    it("parses DIJ matrix", () => {
      expect(pp.nonlocal.dij.length).toBeGreaterThan(0);
      for (const entry of pp.nonlocal.dij) {
        expect(entry.length).toBe(3);
        expect(entry[0]).toBeGreaterThan(0);
        expect(entry[1]).toBeGreaterThan(0);
      }
    });

    it("parses wavefunctions", () => {
      expect(pp.pswfc.length).toBe(2);
      for (const wfc of pp.pswfc) {
        expect(wfc.chi.length).toBe(1095);
        expect(wfc.l).toBeGreaterThanOrEqual(0);
        expect(wfc.occupation).toBeGreaterThanOrEqual(0);
      }
    });

    it("parses full wavefunctions (PAW)", () => {
      expect(pp.fullWfc).toBeDefined();
      expect(pp.fullWfc!.length).toBe(4);
      for (const wfc of pp.fullWfc!) {
        expect(wfc.aewfc.length).toBe(1095);
        expect(wfc.label).toBeDefined();
      }
    });

    it("parses PAW data", () => {
      expect(pp.paw).toBeDefined();
      expect(pp.paw!.pawDataFormat).toBeGreaterThanOrEqual(0);
      expect(pp.paw!.aeNlcc.length).toBe(1095);
      expect(pp.paw!.aeVloc.length).toBe(1095);
      expect(pp.paw!.occupations.length).toBeGreaterThan(0);
      expect(pp.paw!.aeWfcs.length).toBe(4);
      expect(pp.paw!.psWfcs.length).toBe(2);
    });

    it("parses GIPAW data", () => {
      expect(pp.gipaw).toBeDefined();
      expect(pp.gipaw!.coreOrbitals.length).toBe(1);
    });

    it("parses atomic charge density", () => {
      expect(pp.rhoatom.length).toBe(1095);
      expect(pp.rhoatom[0]).toBeGreaterThan(0);
    });
  });

  describe("round-trip with real fixtures", () => {
    it("He NC round-trips losslessly", () => {
      const a = fromUPF(fixtures.heNcUpf);
      const c = fromUPF(toUPF(a));
      expect(c).toEqual(a);
    });

    it("H USPP round-trips losslessly", () => {
      const a = fromUPF(fixtures.hUsppUpf);
      const c = fromUPF(toUPF(a));
      expect(c).toEqual(a);
    });

    it("O PAW round-trips losslessly", () => {
      const a = fromUPF(fixtures.oPawUpf);
      const c = fromUPF(toUPF(a));
      expect(c).toEqual(a);
    });
  });

  describe("Mo UPF v2 from FHI98PP", () => {
    it("parses correctly", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.header.element).toBe("Mo");
      expect(pp.header.zValence).toBeCloseTo(6.0);
    });

    it("has 3 projectors (s, d, f)", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.nonlocal.betas.length).toBe(3);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(2);
      expect(pp.nonlocal.betas[2].angularMomentum).toBe(3);
    });

    it("has lMax=3 (includes f channel)", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.header.lMax).toBe(3);
    });

    it("has correct mesh size", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.mesh.r.length).toBe(20);
      expect(pp.local.vloc.length).toBe(20);
    });

    it("local potential values are physical", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.local.vloc[0]).toBeGreaterThan(0);
      expect(pp.local.vloc[0]).toBeGreaterThan(pp.local.vloc[19]);
    });

    it("s-projector is non-zero near origin", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(Math.abs(pp.nonlocal.betas[0].beta[0])).toBeGreaterThan(1);
    });

    it("d-projector is non-zero", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(Math.abs(pp.nonlocal.betas[1].beta[0])).toBeGreaterThan(1);
    });

    it("f-projector is non-zero near origin", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(Math.abs(pp.nonlocal.betas[2].beta[0])).toBeGreaterThan(0.1);
    });

    it("rhoatom is populated", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.rhoatom.length).toBe(20);
      expect(pp.rhoatom[0]).toBeGreaterThan(0);
    });

    it("D_ij has correct structure for 3 projectors", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.nonlocal.dij.length).toBe(9);
    });

    it("no wavefunctions stored", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.pswfc.length).toBe(0);
    });

    it("round-trips losslessly", () => {
      const a = fromUPF(fixtures.realMoUpfV2Fhi);
      const c = fromUPF(toUPF(a));
      expect(c).toEqual(a);
    });
  });

  describe("error handling", () => {
    it("throws on missing UPF tag", () => {
      expect(() => fromUPF("not a upf file")).toThrow("Not a UPF file");
    });

    it("throws on missing PP_HEADER", () => {
      expect(() => fromUPF('<UPF version="2.0.1"></UPF>')).toThrow(
        "Missing PP_HEADER",
      );
    });
  });
});
