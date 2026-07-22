import { describe, it, expect } from "vitest";

import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";

import * as fixtures from "./teststrings/psp8";

describe("PSP8 parser", () => {
  describe("fromPSP8", () => {
    it("parses H PSP8", () => {
      const pp = fromPSP8(fixtures.hPsp8);

      expect(pp.version).toBe("2.0.1");
      expect(pp.format).toBe("PSP8");
      expect(pp.header.element).toBe("H");
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.relativistic).toBe("scalar");
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.header.zValence).toBeCloseTo(1.0);
      expect(pp.header.lMax).toBe(0);
      expect(pp.header.lLocal).toBe(0);
      expect(pp.header.meshSize).toBe(5);
    });

    it("parses H mesh", () => {
      const pp = fromPSP8(fixtures.hPsp8);
      expect(pp.mesh.r.length).toBe(5);
      expect(pp.mesh.rab.length).toBe(5);
      expect(pp.mesh.rmax).toBeCloseTo(2.0);
      expect(pp.mesh.gridType).toBe("linear");
    });

    it("parses H local potential (lloc=0)", () => {
      const pp = fromPSP8(fixtures.hPsp8);
      expect(pp.local.vloc.length).toBe(5);
      expect(pp.local.vloc[0]).toBeCloseTo(-1.5);
      expect(pp.local.vloc[1]).toBeCloseTo(-0.6);
    });

    it("parses H with no projectors (lloc=0 means the block is local)", () => {
      const pp = fromPSP8(fixtures.hPsp8);
      expect(pp.nonlocal.betas.length).toBe(0);
      expect(pp.nonlocal.dij.length).toBe(0);
    });

    it("parses C PSP8 with projectors", () => {
      const pp = fromPSP8(fixtures.cPsp8);
      expect(pp.header.element).toBe("C");
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.lLocal).toBe(1);
    });

    it("parses C s-projector", () => {
      const pp = fromPSP8(fixtures.cPsp8);
      expect(pp.nonlocal.betas.length).toBe(1);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[0].beta.length).toBe(5);
      expect(pp.nonlocal.betas[0].beta[1]).toBeCloseTo(2.0);
    });

    it("parses C local potential (lloc=1, so p-block is local)", () => {
      const pp = fromPSP8(fixtures.cPsp8);
      expect(pp.local.vloc.length).toBe(5);
      expect(pp.local.vloc[0]).toBeCloseTo(-12.0);
    });

    it("parses C DIJ from ekb", () => {
      const pp = fromPSP8(fixtures.cPsp8);
      expect(pp.nonlocal.dij.length).toBeGreaterThan(0);
      // Should have diagonal elements for the s-projector
      const sEntry = pp.nonlocal.dij.find(([nb, mb]) => nb === mb);
      expect(sEntry).toBeDefined();
    });

    it("parses C xc code", () => {
      const pp = fromPSP8(fixtures.cPsp8);
      expect(pp.header.xcCode).toBe(11); // PBE
    });

    it("parses C mesh from data", () => {
      const pp = fromPSP8(fixtures.cPsp8);
      // Grid should be filled from data columns
      expect(pp.mesh.r[1]).toBeCloseTo(0.5);
      expect(pp.mesh.r[4]).toBeCloseTo(2.0);
    });
  });

  describe("toPSP8", () => {
    it("serializes H PSP8", () => {
      const pp = fromPSP8(fixtures.hPsp8);
      const text = toPSP8(pp);

      expect(text).toContain("H");
      expect(text).toContain("8"); // pspcod
      expect(text).toContain("1"); // lmax
    });

    it("serializes C PSP8 with projectors", () => {
      const pp = fromPSP8(fixtures.cPsp8);
      const text = toPSP8(pp);

      expect(text).toContain("C");
      expect(text).toContain("8"); // pspcod
    });
  });

  describe("round-trip", () => {
    it("H PSP8 round-trips header data", () => {
      const a = fromPSP8(fixtures.hPsp8);
      // Serialize and re-parse
      const text = toPSP8(a);
      const b = fromPSP8(text);

      expect(b.header.element).toBe(a.header.element);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.header.lLocal).toBe(a.header.lLocal);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
    });

    it("C PSP8 round-trips projectors", () => {
      const a = fromPSP8(fixtures.cPsp8);
      const text = toPSP8(a);
      const b = fromPSP8(text);

      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
    });
  });

  describe("error handling", () => {
    it("throws on too-short input", () => {
      expect(() => fromPSP8("line1\nline2\n")).toThrow("too short");
    });

    it("throws on non-PSP8 pspcod", () => {
      const bad = `Title
1.0 1.0 0.0
1    11     0     0     5     0
0.0 0.0 0.0
1
0
`;
      expect(() => fromPSP8(bad)).toThrow("pspcod=8");
    });
  });
});
