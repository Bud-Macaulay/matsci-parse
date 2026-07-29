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
      expect(pp.header.meshSize).toBe(300);
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

    it("uses correct projector labels (s/p/d/f, not s/t/u/v)", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.nonlocal.betas[0].label).toBe("0s");
      expect(pp.nonlocal.betas[1].label).toBe("0s");
      expect(pp.nonlocal.betas[2].label).toBe("1p");
    });

    it("has local potential at end (lloc=4 > lmax=1)", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.local.vloc.length).toBe(300);
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
      expect(pp.nonlocal.betas[2].beta[5]).toBeCloseTo(-0.17133980226378);
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
      expect(pp.local.vloc[9]).toBeCloseTo(-6.8033589342187);
    });

    it("s-projector radial dependence decays correctly", () => {
      const pp = fromPSP8(realCPsp8);
      const s0 = pp.nonlocal.betas[0].beta;
      expect(s0[0]).toBeCloseTo(-8.0352424713936e-10);
      expect(s0[5]).toBeGreaterThan(s0[0]);
    });
  });

  describe("D_ij matrix", () => {
    it("H: uses correct ekb per channel (l=0: 2 s-projectors, l=1: 1 p-projector)", () => {
      const pp = fromPSP8(realHPsp8);
      // H has 3 projectors: 2 at l=0, 1 at l=1
      // l=0 ekb: index 0: -7.9059420149595, index 1: -0.86523006113677
      // l=1 ekb: index 2: -6.8530453025529
      expect(pp.nonlocal.dij[0]).toEqual([1, 1, -7.9059420149595]);
      expect(pp.nonlocal.dij[3]).toEqual([2, 2, -0.86523006113677]);
      expect(pp.nonlocal.dij[4]).toEqual([3, 3, -6.8530453025529]);
    });

    it("C: uses correct ekb per channel (l=0: 2 s-projectors, l=1: 2 p-projectors)", () => {
      const pp = fromPSP8(realCPsp8);
      // C has 4 projectors: 2 at l=0, 2 at l=1
      // l=0 ekb: 6.4422858783765, 0.40708983382477
      // l=1 ekb: -4.6758921437176, -1.1206181429326
      expect(pp.nonlocal.dij[0]).toEqual([1, 1, 6.4422858783765]);
      expect(pp.nonlocal.dij[3]).toEqual([2, 2, 0.40708983382477]);
      expect(pp.nonlocal.dij[4]).toEqual([3, 3, -4.6758921437176]);
      expect(pp.nonlocal.dij[7]).toEqual([4, 4, -1.1206181429326]);
    });
  });

  describe("NLCC (non-linear core correction)", () => {
    it("C PSP8 has NLCC data (fchrg=4.0)", () => {
      const pp = fromPSP8(realCPsp8);
      expect(pp.header.coreCorrection).toBe(true);
      expect(pp.nlcc).toBeDefined();
      expect(pp.nlcc!.length).toBe(600);
      // NLCC values are non-zero (read from file, not zero-filled)
      expect(pp.nlcc![0]).not.toBe(0);
    });

    it("H PSP8 has no NLCC (fchrg=0)", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.header.coreCorrection).toBe(false);
    });
  });

  describe("rhoatom (pseudo valence charge)", () => {
    it("C PSP8 has non-zero rhoatom (extension_switch=1)", () => {
      const pp = fromPSP8(realCPsp8);
      expect(pp.rhoatom).toBeDefined();
      expect(pp.rhoatom.length).toBe(600);
      expect(pp.rhoatom[0]).not.toBe(0);
    });

    it("H PSP8 has non-zero rhoatom (extension_switch=1)", () => {
      const pp = fromPSP8(realHPsp8);
      expect(pp.rhoatom).toBeDefined();
      expect(pp.rhoatom[0]).not.toBe(0);
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
