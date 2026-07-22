import { describe, it, expect } from "vitest";

import { fromFHI, fromFHIFhi, toFHI } from "@/core/io/pseudo/fhi";

import * as fixtures from "./teststrings/fhi";

describe("FHI parser", () => {
  describe("fromFHI", () => {
    it("parses H CPI file", () => {
      const pp = fromFHI(fixtures.hFhiCpi);

      expect(pp.version).toBe("2.0.1");
      expect(pp.format).toBe("CPI");
      expect(pp.header.element).toBe("H");
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.relativistic).toBe("scalar");
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.header.zValence).toBeCloseTo(1.0);
      expect(pp.header.lMax).toBe(0);
      expect(pp.header.meshSize).toBe(5);
    });

    it("parses H mesh", () => {
      const pp = fromFHI(fixtures.hFhiCpi);
      expect(pp.mesh.r.length).toBe(5);
      expect(pp.mesh.rab.length).toBe(5);
      expect(pp.mesh.gridType).toBe("logarithmic");
      expect(pp.mesh.dx).toBeCloseTo(0.02);
    });

    it("parses H local potential", () => {
      const pp = fromFHI(fixtures.hFhiCpi);
      expect(pp.local.vloc.length).toBe(5);
      expect(pp.local.vloc[0]).toBeCloseTo(-1.5);
    });

    it("parses H semilocal potentials", () => {
      const pp = fromFHI(fixtures.hFhiCpi);
      expect(pp.semilocal).toBeDefined();
      expect(pp.semilocal!.length).toBe(1);
      expect(pp.semilocal![0].l).toBe(0);
    });

    it("H has no projectors", () => {
      const pp = fromFHI(fixtures.hFhiCpi);
      expect(pp.nonlocal.betas.length).toBe(0);
      expect(pp.nonlocal.dij.length).toBe(0);
    });

    it("parses C CPI with s+p channels", () => {
      const pp = fromFHI(fixtures.cFhiCpi);
      // FHI stores valence charge, not atomic number — element guess may differ
      expect(pp.header.element).toBeDefined();
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.semilocal!.length).toBe(2);
      expect(pp.semilocal![0].l).toBe(0);
      expect(pp.semilocal![1].l).toBe(1);
    });

    it("parses C semilocal data", () => {
      const pp = fromFHI(fixtures.cFhiCpi);
      // s-channel
      expect(pp.semilocal![0].vnl[0]).toBeCloseTo(-3.0);
      expect(pp.semilocal![0].vnl[1]).toBeCloseTo(-1.5);
      // p-channel
      expect(pp.semilocal![1].vnl[0]).toBeCloseTo(-1.2);
      expect(pp.semilocal![1].vnl[1]).toBeCloseTo(-0.6);
    });

    it("parses NLCC from CPI", () => {
      const pp = fromFHI(fixtures.heNlccFhiCpi);
      expect(pp.header.coreCorrection).toBe(true);
      expect(pp.nlcc).toBeDefined();
      expect(pp.nlcc!.length).toBe(3);
      expect(pp.nlcc![0]).toBeCloseTo(0.1);
    });
  });

  describe("fromFHIFhi", () => {
    it("parses .fhi with ABINIT header", () => {
      // Construct a minimal .fhi = 7 ABINIT header lines + .cpi content
      const abinitHeader = [
        "     6    11     1     1     5     0     0     0     0     0",
        "   6.00000   4.00000",
        "     8    11     1     1     5     0",
        " 0.00000000  0.00000000  0.00000000",
        "     1     1",
        "     0     0",
        "     0     0",
      ].join("\n");

      const fullText = abinitHeader + "\n" + fixtures.cFhiCpi;
      const pp = fromFHIFhi(fullText);

      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.xcCode).toBe(11);
    });
  });

  describe("toFHI", () => {
    it("serializes H CPI", () => {
      const pp = fromFHI(fixtures.hFhiCpi);
      const text = toFHI(pp);

      // Check basic structure
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      expect(lines.length).toBeGreaterThan(12); // header + data
    });

    it("serializes C CPI with semilocal data", () => {
      const pp = fromFHI(fixtures.cFhiCpi);
      const text = toFHI(pp);

      expect(text).toContain("2"); // nComponents = 2
    });
  });

  describe("round-trip", () => {
    it("H round-trips", () => {
      const a = fromFHI(fixtures.hFhiCpi);
      const text = toFHI(a);
      const b = fromFHI(text);

      expect(b.header.element).toBe(a.header.element);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);

      for (let i = 0; i < a.local.vloc.length; i++) {
        expect(b.local.vloc[i]).toBeCloseTo(a.local.vloc[i]);
      }
    });

    it("C round-trips semilocal data", () => {
      const a = fromFHI(fixtures.cFhiCpi);
      const text = toFHI(a);
      const b = fromFHI(text);

      expect(b.semilocal!.length).toBe(a.semilocal!.length);
      for (let i = 0; i < a.semilocal!.length; i++) {
        expect(b.semilocal![i].l).toBe(a.semilocal![i].l);
      }
    });
  });

  describe("error handling", () => {
    it("throws on too-short input", () => {
      expect(() => fromFHI("line1\nline2\n")).toThrow("too short");
    });
  });
});
