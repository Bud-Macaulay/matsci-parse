import { describe, it, expect } from "vitest";

import { fromUPF, toUPF } from "@/core/io/pseudo/upf";

import * as fixtures from "./teststrings/upf";

describe("UPF parser", () => {
  describe("fromUPF", () => {
    it("parses a minimal Carbon HGH UPF", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.version).toBe("2.0.1");
      expect(pp.header.element).toBe("C");
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.relativistic).toBe("scalar");
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.hasSo).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.header.functional).toBe("SLA-PW-PBX-PBC");
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.meshSize).toBe(10);
      expect(pp.header.numberOfWfc).toBe(2);
      expect(pp.header.numberOfProj).toBe(1);
    });

    it("parses PP_INFO section", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);
      expect(pp.info).toContain("Goedecker");
      expect(pp.info).toContain("Element:");
    });

    it("parses PP_MESH section", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.mesh.r.length).toBe(10);
      expect(pp.mesh.rab.length).toBe(10);
      expect(pp.mesh.rmax).toBeCloseTo(100.3075063120137);
      expect(pp.mesh.dx).toBeCloseTo(0.0125);
      expect(pp.mesh.zmesh).toBeCloseTo(6.0);

      // Check first few radial grid values
      expect(pp.mesh.r[0]).toBeCloseTo(1.519803275924194e-4);
      expect(pp.mesh.r[9]).toBeCloseTo(1.700769682051924e-4);
    });

    it("parses PP_LOCAL section", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.local.vloc.length).toBe(10);
      expect(pp.local.vloc[0]).toBeCloseTo(-48.87648244434221);
    });

    it("parses PP_NONLOCAL section with beta projectors", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.nonlocal.betas.length).toBe(1);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[0].label).toBe("2S");
      expect(pp.nonlocal.betas[0].beta.length).toBe(10);
      expect(pp.nonlocal.betas[0].beta[0]).toBeCloseTo(3.456789012345678);
    });

    it("parses PP_DIJ matrix elements", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.nonlocal.dij.length).toBe(1);
      expect(pp.nonlocal.dij[0][0]).toBe(1);
      expect(pp.nonlocal.dij[0][1]).toBe(1);
      expect(pp.nonlocal.dij[0][2]).toBeCloseTo(-23.45678901234567);
    });

    it("parses PP_PSWFC wavefunctions", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.pswfc.length).toBe(2);

      expect(pp.pswfc[0].l).toBe(0);
      expect(pp.pswfc[0].occupation).toBeCloseTo(2.0);
      expect(pp.pswfc[0].label).toBe("2S");
      expect(pp.pswfc[0].chi.length).toBe(10);

      expect(pp.pswfc[1].l).toBe(1);
      expect(pp.pswfc[1].label).toBe("2P");
    });

    it("parses PP_RHOATOM section", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.rhoatom.length).toBe(10);
      expect(pp.rhoatom[0]).toBeCloseTo(1.234567890123456);
    });

    it("handles optional sections as undefined", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);

      expect(pp.nlcc).toBeUndefined();
      expect(pp.semilocal).toBeUndefined();
      expect(pp.fullWfc).toBeUndefined();
      expect(pp.paw).toBeUndefined();
      expect(pp.gipaw).toBeUndefined();
      expect(pp.spinOrbit).toBeUndefined();
    });

    it("throws on missing UPF tag", () => {
      expect(() => fromUPF("not a upf file")).toThrow("Not a UPF file");
    });

    it("throws on missing PP_HEADER", () => {
      expect(() => fromUPF('<UPF version="2.0.1"></UPF>')).toThrow(
        "Missing PP_HEADER",
      );
    });
  });

  describe("toUPF", () => {
    it("serializes a parsed pseudopotential", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);
      const serialized = toUPF(pp);

      expect(serialized).toContain('<UPF version="2.0.1">');
      expect(serialized).toContain("<PP_HEADER");
      expect(serialized).toContain('element="C"');
      expect(serialized).toContain('pseudo_type="NC"');
      expect(serialized).toContain("</UPF>");
    });
  });

  describe("round-trip", () => {
    it("parses, serializes, and re-parses to the same data", () => {
      const a = fromUPF(fixtures.carbonHghUpf);
      const text1 = toUPF(a);
      const b = fromUPF(text1);

      // Header preserved
      expect(b.header.element).toBe(a.header.element);
      expect(b.header.pseudoType).toBe(a.header.pseudoType);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.header.meshSize).toBe(a.header.meshSize);

      // Mesh preserved
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      for (let i = 0; i < a.mesh.r.length; i++) {
        expect(b.mesh.r[i]).toBeCloseTo(a.mesh.r[i]);
      }

      // Local potential preserved
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
      for (let i = 0; i < a.local.vloc.length; i++) {
        expect(b.local.vloc[i]).toBeCloseTo(a.local.vloc[i]);
      }

      // Nonlocal preserved
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.nonlocal.dij.length).toBe(a.nonlocal.dij.length);

      // Wavefunctions preserved
      expect(b.pswfc.length).toBe(a.pswfc.length);
      expect(b.pswfc[0].l).toBe(a.pswfc[0].l);
      expect(b.pswfc[0].occupation).toBeCloseTo(a.pswfc[0].occupation);

      // Rhoatom preserved
      expect(b.rhoatom.length).toBe(a.rhoatom.length);
      for (let i = 0; i < a.rhoatom.length; i++) {
        expect(b.rhoatom[i]).toBeCloseTo(a.rhoatom[i]);
      }
    });

    it("serializer reaches fixed point", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);
      const text1 = toUPF(pp);
      const pp2 = fromUPF(text1);
      const text2 = toUPF(pp2);

      expect(text2).toBe(text1);
    });
  });

  describe("Fortran number parsing", () => {
    it("parses D-notation exponents", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);
      // z_valence should be 4.0 from "4.000000000000000E+000"
      expect(pp.header.zValence).toBeCloseTo(4.0);
    });

    it("parses negative D-notation exponents", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);
      // dx should be 0.0125 from "1.250000000000000E-002"
      expect(pp.mesh.dx).toBeCloseTo(0.0125);
    });
  });

  describe("Fortran boolean parsing", () => {
    it("parses .false. as false", () => {
      const pp = fromUPF(fixtures.carbonHghUpf);
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.hasSo).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
    });

    it("parses 'true' as true", () => {
      const pp = fromUPF(fixtures.oPawUpf);
      expect(pp.header.isUltrasoft).toBe(true);
      expect(pp.header.isPaw).toBe(true);
      expect(pp.header.hasWfc).toBe(true);
      expect(pp.header.hasGipaw).toBe(true);
      expect(pp.header.coreCorrection).toBe(true);
    });
  });

  // ── Real SSSP fixtures ────────────────────────────────────────────

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
    it("He NC round-trips", () => {
      const a = fromUPF(fixtures.heNcUpf);
      const text = toUPF(a);
      const b = fromUPF(text);

      expect(b.header.element).toBe("He");
      expect(b.header.pseudoType).toBe("NC");
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.pswfc.length).toBe(a.pswfc.length);
      expect(b.rhoatom.length).toBe(a.rhoatom.length);

      // Spot-check numerical data
      for (let i = 0; i < Math.min(10, a.mesh.r.length); i++) {
        expect(b.mesh.r[i]).toBeCloseTo(a.mesh.r[i]);
      }
    });

    it("H USPP round-trips", () => {
      const a = fromUPF(fixtures.hUsppUpf);
      const text = toUPF(a);
      const b = fromUPF(text);

      expect(b.header.element).toBe("H");
      expect(b.header.pseudoType).toBe("US");
      expect(b.header.isUltrasoft).toBe(true);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.pswfc.length).toBe(a.pswfc.length);
    });

    it("O PAW round-trips", () => {
      const a = fromUPF(fixtures.oPawUpf);
      const text = toUPF(a);
      const b = fromUPF(text);

      expect(b.header.element).toBe("O");
      expect(b.header.pseudoType).toBe("PAW");
      expect(b.header.isPaw).toBe(true);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.nlcc!.length).toBe(a.nlcc!.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.fullWfc!.length).toBe(a.fullWfc!.length);
      expect(b.pswfc.length).toBe(a.pswfc.length);
      expect(b.paw!.aeWfcs.length).toBe(a.paw!.aeWfcs.length);
      expect(b.paw!.psWfcs.length).toBe(a.paw!.psWfcs.length);
    });
  });
});
