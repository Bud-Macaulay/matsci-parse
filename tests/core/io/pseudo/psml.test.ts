import { describe, it, expect } from "vitest";

import { fromPSML, toPSML } from "@/core/io/pseudo/psml";
import { fromUPF, toUPF } from "@/core/io/pseudo/upf";

import * as fixtures from "./teststrings/psml";

describe("PSML parser", () => {
  describe("fromPSML", () => {
    it("parses He NC PSML", () => {
      const pp = fromPSML(fixtures.heNcPsml);

      expect(pp.version).toBe("2.0.1");
      expect(pp.format).toBe("PSML");
      expect(pp.header.element).toBe("He");
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.relativistic).toBe("scalar");
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.header.zValence).toBeCloseTo(2.0);
    });

    it("parses provenance", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.provenance).toBeDefined();
      expect(pp.provenance!.creator).toBe("test-generator");
      expect(pp.provenance!.date).toBe("2024-01-15");
    });

    it("parses grid", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.mesh.r.length).toBe(5);
      expect(pp.mesh.rab.length).toBe(5);
      expect(pp.mesh.rmax).toBeCloseTo(0.5);
      expect(pp.mesh.gridType).toBe("custom");
    });

    it("parses local potential", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.local.vloc.length).toBe(5);
      expect(pp.local.vloc[0]).toBeCloseTo(-3.5);
    });

    it("parses semilocal potentials", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.semilocal).toBeDefined();
      expect(pp.semilocal!.length).toBe(1);
      expect(pp.semilocal![0].l).toBe(0);
      expect(pp.semilocal![0].vnl.length).toBe(5);
    });

    it("parses nonlocal projectors", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.nonlocal.betas.length).toBe(1);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[0].beta.length).toBe(5);
    });

    it("parses DIJ from ekb attributes", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.nonlocal.dij.length).toBe(1);
      expect(pp.nonlocal.dij[0][0]).toBe(1);
      expect(pp.nonlocal.dij[0][1]).toBe(1);
      expect(pp.nonlocal.dij[0][2]).toBeCloseTo(1.5);
    });

    it("parses pseudo wavefunctions", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.pswfc.length).toBe(1);
      expect(pp.pswfc[0].l).toBe(0);
      expect(pp.pswfc[0].chi.length).toBe(5);
      expect(pp.pswfc[0].n).toBe(1);
    });

    it("parses valence charge", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      expect(pp.rhoatom.length).toBe(5);
      expect(pp.rhoatom[0]).toBeCloseTo(0.5);
    });

    it("parses NLCC", () => {
      const pp = fromPSML(fixtures.cNlccPsml);
      expect(pp.nlcc).toBeDefined();
      expect(pp.nlcc!.length).toBe(5);
      expect(pp.nlcc![0]).toBeCloseTo(0.2);
    });

    it("parses two-projector fixture", () => {
      const pp = fromPSML(fixtures.cNlccPsml);
      expect(pp.header.element).toBe("C");
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.nonlocal.betas.length).toBe(2);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(1);
      expect(pp.semilocal!.length).toBe(2);
      expect(pp.pswfc.length).toBe(2);
    });

    it("parses functional from libxc-info", () => {
      const pp = fromPSML(fixtures.cNlccPsml);
      expect(pp.header.functional).toContain("XC_GGA_X_PBE");
    });

    it("throws on empty grid", () => {
      expect(() => fromPSML("<psml><grid><grid-data></grid-data></grid></psml>")).toThrow("Missing or empty grid");
    });
  });

  describe("toPSML", () => {
    it("serializes to valid PSML XML", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      const text = toPSML(pp);

      expect(text).toContain('<?xml version="1.0"');
      expect(text).toContain('<psml version="1.2"');
      expect(text).toContain("energy_unit=\"hartree\"");
      expect(text).toContain("length_unit=\"bohr\"");
      expect(text).toContain("</psml>");
    });

    it("serializes element and z-pseudo", () => {
      const pp = fromPSML(fixtures.heNcPsml);
      const text = toPSML(pp);

      expect(text).toContain('atomic-label="He"');
      expect(text).toContain('z-pseudo="2"');
    });
  });

  describe("round-trip", () => {
    it("He NC round-trips", () => {
      const a = fromPSML(fixtures.heNcPsml);
      const text = toPSML(a);
      const b = fromPSML(text);

      expect(b.header.element).toBe(a.header.element);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);

      for (let i = 0; i < a.mesh.r.length; i++) {
        expect(b.mesh.r[i]).toBeCloseTo(a.mesh.r[i]);
      }
      for (let i = 0; i < a.local.vloc.length; i++) {
        expect(b.local.vloc[i]).toBeCloseTo(a.local.vloc[i]);
      }
    });

    it("C NLCC round-trips", () => {
      const a = fromPSML(fixtures.cNlccPsml);
      const text = toPSML(a);
      const b = fromPSML(text);

      expect(b.header.element).toBe("C");
      expect(b.nlcc).toBeDefined();
      expect(b.nlcc!.length).toBe(a.nlcc!.length);
      expect(b.nonlocal.betas.length).toBe(2);
      expect(b.semilocal!.length).toBe(2);
    });
  });

  describe("cross-format: PSML → UPF", () => {
    it("converts PSML to UPF-compatible Pseudopotential", () => {
      const psml = fromPSML(fixtures.heNcPsml);
      // Re-serialize as UPF (format conversion via toY(fromX))
      const upfText = toUPF(psml);
      const upf = fromUPF(upfText);

      expect(upf.header.element).toBe("He");
      expect(upf.header.zValence).toBeCloseTo(2.0);
      expect(upf.nonlocal.betas.length).toBe(1);
    });
  });
});
