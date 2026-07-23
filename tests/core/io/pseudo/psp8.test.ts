import { describe, it, expect } from "vitest";

import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";

import { realHPsp8, realCPsp8 } from "./teststrings/psp8";

describe("PSP8 parser", () => {
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

  describe("real-world H PSP8 from PseudoDojo", () => {
    it("parses correctly", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.header.element).toBe("H");
      expect(pp.header.zValence).toBeCloseTo(1.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.lLocal).toBe(4);
      expect(pp.header.meshSize).toBe(10);
    });

    it("has correct xc code", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.header.xcCode).toBe(11);
    });

    it("has 3 projectors (2 s + 1 p)", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.nonlocal.betas.length).toBe(3);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[2].angularMomentum).toBe(1);
    });

    it("has local potential at end (lloc=4 > lmax=1)", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.local.vloc.length).toBe(10);
      expect(pp.local.vloc[0]).toBeCloseTo(-3.151120944933);
      expect(pp.local.vloc[1]).toBeCloseTo(-3.1502630770291);
    });

    it("has correct radial grid from data", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.mesh.r[0]).toBeCloseTo(0);
      expect(pp.mesh.r[1]).toBeCloseTo(0.01);
      expect(pp.mesh.r[9]).toBeCloseTo(0.09);
    });

    it("s-projector data matches PseudoDojo values", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.nonlocal.betas[0].beta[0]).toBeCloseTo(-4.8696255250391e-8);
      expect(pp.nonlocal.betas[0].beta[1]).toBeCloseTo(0.25608705663206);
    });

    it("p-projector data matches PseudoDojo values", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.nonlocal.betas[2].beta[0]).toBeCloseTo(-2.7904952299984e-6);
      expect(pp.nonlocal.betas[2].beta[5]).toBeCloseTo(-0.15146972560029);
    });

    it("nonlinear core corrections are absent", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.nlcc).toBeUndefined();
    });
  });

  describe("real-world C PSP8 from PseudoDojo", () => {
    it("parses correctly", () => {
      const pp = fromPSP8(realCPsp8);
      expect(pp.header.element).toBe("C");
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.lLocal).toBe(4);
    });

    it("has 4 projectors (2 s + 2 p)", () => {
      const pp = fromPSP8(realCPsp8);
      expect(pp.nonlocal.betas.length).toBe(4);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[2].angularMomentum).toBe(1);
      expect(pp.nonlocal.betas[3].angularMomentum).toBe(1);
    });

    it("local potential matches ONCVPSP values", () => {
      const pp = fromPSP8(realCPsp8);
      expect(pp.local.vloc[0]).toBeCloseTo(-6.8386740285773);
      expect(pp.local.vloc[9]).toBeCloseTo(-6.8037930112455);
    });

    it("s-projector radial dependence decays correctly", () => {
      const pp = fromPSP8(realCPsp8);
      const s0 = pp.nonlocal.betas[0].beta;
      expect(s0[0]).toBeCloseTo(-8.0352424713936e-10);
      expect(s0[5]).toBeGreaterThan(s0[0]);
    });
  });

  describe("real-world round-trip", () => {
    it("H PSP8 round-trips losslessly", () => {
      const a = fromPSP8(realHPsp8);
      const c = fromPSP8(toPSP8(a));
      expect(c).toEqual(a);
    });

    it("C PSP8 round-trips losslessly", () => {
      const a = fromPSP8(realCPsp8);
      const c = fromPSP8(toPSP8(a));
      expect(c).toEqual(a);
    });
  });
});
