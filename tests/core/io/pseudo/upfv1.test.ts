import { describe, it, expect } from "vitest";

import { fromUPFv1, toUPFv1 } from "@/core/io/pseudo/upf-v1";

import * as fixtures from "./teststrings/upfv1";

describe("UPF v1 parser", () => {
  describe("fromUPFv1", () => {
    it("parses H UPF v1", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);

      expect(pp.version).toBe("1.0.0");
      expect(pp.format).toBe("UPF1");
      expect(pp.header.element).toBe("H");
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.relativistic).toBe("scalar");
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
    });

    it("parses mesh", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      expect(pp.mesh.r.length).toBe(5);
      expect(pp.mesh.rab.length).toBe(5);
      expect(pp.mesh.gridType).toBe("logarithmic");
    });

    it("parses mesh data", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      expect(pp.mesh.r[0]).toBeCloseTo(0.05);
      expect(pp.mesh.r[4]).toBeCloseTo(0.25);
    });

    it("parses local potential", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      expect(pp.local.vloc.length).toBe(5);
      expect(pp.local.vloc[0]).toBeCloseTo(-1.5);
    });

    it("parses projectors", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      expect(pp.nonlocal.betas.length).toBe(1);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[0].beta.length).toBe(5);
    });

    it("parses D_ij", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      expect(pp.nonlocal.dij.length).toBe(1);
      expect(pp.nonlocal.dij[0][0]).toBe(1);
      expect(pp.nonlocal.dij[0][1]).toBe(1);
      expect(pp.nonlocal.dij[0][2]).toBeCloseTo(2.3);
    });

    it("parses wavefunctions", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      expect(pp.pswfc.length).toBe(1);
      expect(pp.pswfc[0].l).toBe(0);
      expect(pp.pswfc[0].chi.length).toBe(5);
    });

    it("parses rhoatom", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      expect(pp.rhoatom.length).toBe(5);
      expect(pp.rhoatom[0]).toBeCloseTo(0.5);
    });
  });

  describe("toUPFv1", () => {
    it("serializes to UPF v1 format", () => {
      const pp = fromUPFv1(fixtures.hUpfV1);
      const text = toUPFv1(pp);

      expect(text).toContain("     0"); // version
      expect(text).toContain("'H'");
      expect(text).toContain("'NC'");
      expect(text).toContain("<PP_MESH>");
      expect(text).toContain("<PP_LOCAL>");
      expect(text).toContain("<PP_NONLOCAL>");
      expect(text).toContain("<PP_RHOATOM>");
    });
  });

  describe("round-trip", () => {
    it("H UPF v1 round-trips", () => {
      const a = fromUPFv1(fixtures.hUpfV1);
      const text = toUPFv1(a);
      const b = fromUPFv1(text);

      expect(b.header.element).toBe(a.header.element);
      expect(b.header.pseudoType).toBe(a.header.pseudoType);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.pswfc.length).toBe(a.pswfc.length);

      for (let i = 0; i < a.local.vloc.length; i++) {
        expect(b.local.vloc[i]).toBeCloseTo(a.local.vloc[i]);
      }
    });
  });

  describe("error handling", () => {
    it("throws on non-version first line", () => {
      expect(() => fromUPFv1("not a version number")).toThrow("Not a UPF v1 file");
    });

    it("throws on missing PP_HEADER", () => {
      expect(() => fromUPFv1("0\nno header here")).toThrow("Missing PP_HEADER");
    });
  });
});
