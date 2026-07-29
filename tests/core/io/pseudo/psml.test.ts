import { describe, it, expect } from "vitest";

import { fromPSML } from "@/core/io/pseudo/psml";
import { realHPsml, realCPsml, realOPsml } from "./teststrings/psml";

describe("PSML parser", () => {
  describe("error handling", () => {
    it("throws on empty grid", () => {
      expect(() => fromPSML("<psml><grid><grid-data></grid-data></grid></psml>")).toThrow("Missing or empty grid");
    });
  });

  describe("real-world H PSML (ONCVPSP)", () => {
    const pp = fromPSML(realHPsml);

    it("parses header correctly", () => {
      expect(pp.header.element).toBe("H");
      expect(pp.header.zValence).toBe(1);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.meshSize).toBe(457);
    });

    it("parses mesh", () => {
      expect(pp.mesh.r.length).toBe(457);
      expect(pp.mesh.r[0]).toBe(0);
    });

    it("parses local potential", () => {
      expect(pp.local.vloc.length).toBeGreaterThan(0);
    });

    it("parses nonlocal projectors", () => {
      expect(pp.nonlocal.betas.length).toBe(3);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[2].angularMomentum).toBe(1);
    });

    it("has semilocal components", () => {
      expect(pp.semilocal).toBeDefined();
      expect(pp.semilocal!.length).toBe(2);
    });
  });

  describe("real-world C PSML (ONCVPSP)", () => {
    const pp = fromPSML(realCPsml);

    it("parses header correctly", () => {
      expect(pp.header.element).toBe("C");
      expect(pp.header.zValence).toBe(4);
      expect(pp.header.lMax).toBe(1);
      expect(pp.nonlocal.betas.length).toBe(4);
    });
  });

  describe("real-world O PSML (ONCVPSP)", () => {
    const pp = fromPSML(realOPsml);

    it("parses header correctly", () => {
      expect(pp.header.element).toBe("O");
      expect(pp.header.zValence).toBe(6);
      expect(pp.header.lMax).toBe(2);
      expect(pp.nonlocal.betas.length).toBe(5);
    });
  });
});
