import { describe, it, expect } from "vitest";

import { fromGTH, parseGTHFile } from "@/core/io/pseudo/gth";
import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";
import { fromUPF } from "@/core/io/pseudo/upf";

import * as rw from "./teststrings/real-world";

describe("Real-world GTH pseudopotentials", () => {
  describe("H GTH-PBE from CP2K", () => {
    it("parses correctly", () => {
      const pp = fromGTH(rw.realHGthPbe);
      expect(pp.header.element).toBe("H");
      expect(pp.header.zValence).toBeCloseTo(1.0);
      expect(pp.header.functional).toBe("GTH-PBE-q1");
      expect(pp.format).toBe("GTH");
    });

    it("has local potential with correct rLoc", () => {
      const pp = fromGTH(rw.realHGthPbe);
      expect(pp.gth).toBeDefined();
      expect(pp.gth!.rLoc).toBeCloseTo(0.2);
      expect(pp.gth!.cexpPpl.length).toBe(2);
      expect(pp.gth!.cexpPpl[0]).toBeCloseTo(-4.17890044);
      expect(pp.gth!.cexpPpl[1]).toBeCloseTo(0.72446331);
    });

    it("has no non-local projectors", () => {
      const pp = fromGTH(rw.realHGthPbe);
      expect(pp.nonlocal.betas.length).toBe(0);
      expect(pp.nonlocal.dij.length).toBe(0);
    });

    it("has mesh of 500 points", () => {
      const pp = fromGTH(rw.realHGthPbe);
      expect(pp.mesh.r.length).toBe(500);
      expect(pp.local.vloc.length).toBe(500);
    });

    it("local potential is negative near origin", () => {
      const pp = fromGTH(rw.realHGthPbe);
      expect(pp.local.vloc[5]).toBeLessThan(0);
    });
  });

  describe("He GTH-PBE from CP2K", () => {
    it("parses correctly", () => {
      const pp = fromGTH(rw.realHeGthPbe);
      expect(pp.header.element).toBe("He");
      expect(pp.header.zValence).toBeCloseTo(2.0);
      expect(pp.gth!.rLoc).toBeCloseTo(0.2);
      expect(pp.gth!.cexpPpl).toEqual([-9.12214383, 1.7027077]);
    });
  });

  describe("C GTH-PBE from CP2K", () => {
    it("parses correctly", () => {
      const pp = fromGTH(rw.realCGthPbe);
      expect(pp.header.element).toBe("C");
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.functional).toBe("GTH-PBE-q4");
    });

    it("has one beta projector (s-channel only; p has nprjPpnl=0)", () => {
      const pp = fromGTH(rw.realCGthPbe);
      expect(pp.nonlocal.betas.length).toBe(1);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
    });

    it("has correct GTH parameters", () => {
      const pp = fromGTH(rw.realCGthPbe);
      expect(pp.gth!.rLoc).toBeCloseTo(0.33847124);
      expect(pp.gth!.cexpPpl.length).toBe(2);
      expect(pp.gth!.rPs.length).toBe(2);
      expect(pp.gth!.rPs[0]).toBeCloseTo(0.30257575);
      expect(pp.gth!.rPs[1]).toBeCloseTo(0.29150694);
    });

    it("h-matrix elements match CP2K data", () => {
      const pp = fromGTH(rw.realCGthPbe);
      // s-channel: 1x1 h-matrix
      expect(pp.gth!.hprj[0]).toEqual([[9.62248665]]);
      // p-channel: empty (nprjPpnl=0)
      expect(pp.gth!.hprj[1]).toEqual([]);
    });

    it("D_ij entries are correct", () => {
      const pp = fromGTH(rw.realCGthPbe);
      expect(pp.nonlocal.dij.length).toBe(1);
      expect(pp.nonlocal.dij[0][2]).toBeCloseTo(9.62248665);
    });
  });

  describe("N GTH-PBE from CP2K", () => {
    it("parses correctly", () => {
      const pp = fromGTH(rw.realNGthPbe);
      expect(pp.header.element).toBe("N");
      expect(pp.header.zValence).toBeCloseTo(5.0);
      expect(pp.nonlocal.betas.length).toBe(1);
      expect(pp.gth!.rLoc).toBeCloseTo(0.28379051);
    });
  });

  describe("O GTH-PBE from CP2K", () => {
    it("parses correctly", () => {
      const pp = fromGTH(rw.realOGthPbe);
      expect(pp.header.element).toBe("O");
      expect(pp.header.zValence).toBeCloseTo(6.0);
      expect(pp.nonlocal.betas.length).toBe(1);
    });
  });

  describe("Multi-element GTH file", () => {
    it("parses 3 entries", () => {
      const entries = parseGTHFile(rw.realMultiGth);
      expect(entries.length).toBe(3);
      expect(entries[0].element).toBe("H");
      expect(entries[1].element).toBe("He");
      expect(entries[2].element).toBe("C");
    });

    it("parses first entry", () => {
      const pp = fromGTH(rw.realMultiGth);
      expect(pp.header.element).toBe("H");
    });
  });
});

describe("Real-world PSP8 pseudopotentials", () => {
  describe("H PSP8 from PseudoDojo", () => {
    it("parses correctly", () => {
      const pp = fromPSP8(rw.realHPsp8);
      expect(pp.header.element).toBe("H");
      expect(pp.header.zValence).toBeCloseTo(1.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.lLocal).toBe(4);
      expect(pp.header.meshSize).toBe(10);
    });

    it("has correct xc code", () => {
      const pp = fromPSP8(rw.realHPsp8);
      expect(pp.header.xcCode).toBe(11); // PBE
    });

    it("has 3 projectors (2 s + 1 p)", () => {
      const pp = fromPSP8(rw.realHPsp8);
      expect(pp.nonlocal.betas.length).toBe(3);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[2].angularMomentum).toBe(1);
    });

    it("has local potential at end (lloc=4 > lmax=1)", () => {
      const pp = fromPSP8(rw.realHPsp8);
      expect(pp.local.vloc.length).toBe(10);
      expect(pp.local.vloc[0]).toBeCloseTo(-3.151120944933);
      expect(pp.local.vloc[1]).toBeCloseTo(-3.1502630770291);
    });

    it("has correct radial grid from data", () => {
      const pp = fromPSP8(rw.realHPsp8);
      expect(pp.mesh.r[0]).toBeCloseTo(0);
      expect(pp.mesh.r[1]).toBeCloseTo(0.01);
      expect(pp.mesh.r[9]).toBeCloseTo(0.09);
    });

    it("s-projector data matches PseudoDojo values", () => {
      const pp = fromPSP8(rw.realHPsp8);
      // First s-projector
      expect(pp.nonlocal.betas[0].beta[0]).toBeCloseTo(-4.8696255250391e-8);
      expect(pp.nonlocal.betas[0].beta[1]).toBeCloseTo(0.25608705663206);
    });

    it("p-projector data matches PseudoDojo values", () => {
      const pp = fromPSP8(rw.realHPsp8);
      // p-projector
      expect(pp.nonlocal.betas[2].beta[0]).toBeCloseTo(-2.7904952299984e-6);
      expect(pp.nonlocal.betas[2].beta[5]).toBeCloseTo(-0.15146972560029);
    });

    it("nonlinear core corrections are absent", () => {
      const pp = fromPSP8(rw.realHPsp8);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.nlcc).toBeUndefined();
    });
  });

  describe("C PSP8 from PseudoDojo", () => {
    it("parses correctly", () => {
      const pp = fromPSP8(rw.realCPsp8);
      expect(pp.header.element).toBe("C");
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.lMax).toBe(1);
      expect(pp.header.lLocal).toBe(4);
    });

    it("has 4 projectors (2 s + 2 p)", () => {
      const pp = fromPSP8(rw.realCPsp8);
      expect(pp.nonlocal.betas.length).toBe(4);
      // 2 s-projectors
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(0);
      // 2 p-projectors
      expect(pp.nonlocal.betas[2].angularMomentum).toBe(1);
      expect(pp.nonlocal.betas[3].angularMomentum).toBe(1);
    });

    it("local potential matches ONCVPSP values", () => {
      const pp = fromPSP8(rw.realCPsp8);
      expect(pp.local.vloc[0]).toBeCloseTo(-6.8386740285773);
      expect(pp.local.vloc[9]).toBeCloseTo(-6.8037930112455);
    });

    it("s-projector radial dependence decays correctly", () => {
      const pp = fromPSP8(rw.realCPsp8);
      const s0 = pp.nonlocal.betas[0].beta;
      // Should rise then decay
      expect(s0[0]).toBeCloseTo(-8.0352424713936e-10);
      expect(s0[5]).toBeGreaterThan(s0[0]);
    });
  });

  describe("round-trip", () => {
    it("H PSP8 round-trips header data", () => {
      const a = fromPSP8(rw.realHPsp8);
      const text = toPSP8(a);
      const b = fromPSP8(text);
      expect(b.header.element).toBe(a.header.element);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
    });
  });
});

describe("Real-world UPF v2 pseudopotentials (FHI origin)", () => {
  describe("Mo UPF v2 from FHI98PP", () => {
    it("parses correctly", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(pp.header.element).toBe("Mo");
      expect(pp.header.zValence).toBeCloseTo(6.0);
    });

    it("has 3 projectors (s, d, f)", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(pp.nonlocal.betas.length).toBe(3);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(2);
      expect(pp.nonlocal.betas[2].angularMomentum).toBe(3);
    });

    it("has lMax=3 (includes f channel)", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(pp.header.lMax).toBe(3);
    });

    it("has correct mesh size", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(pp.mesh.r.length).toBe(20);
      expect(pp.local.vloc.length).toBe(20);
    });

    it("local potential values are physical", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      // Local potential should be positive (repulsive at short range for pseudopotential)
      expect(pp.local.vloc[0]).toBeGreaterThan(0);
      // Should decrease with distance
      expect(pp.local.vloc[0]).toBeGreaterThan(pp.local.vloc[19]);
    });

    it("s-projector is non-zero near origin", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(Math.abs(pp.nonlocal.betas[0].beta[0])).toBeGreaterThan(1);
    });

    it("d-projector is non-zero", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(Math.abs(pp.nonlocal.betas[1].beta[0])).toBeGreaterThan(1);
    });

    it("f-projector is non-zero near origin", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(Math.abs(pp.nonlocal.betas[2].beta[0])).toBeGreaterThan(0.1);
    });

    it("rhoatom is populated", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(pp.rhoatom.length).toBe(20);
      expect(pp.rhoatom[0]).toBeGreaterThan(0);
    });

    it("D_ij has correct structure for 3 projectors", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(pp.nonlocal.dij.length).toBe(9); // 3x3 matrix
    });

    it("no wavefunctions stored", () => {
      const pp = fromUPF(rw.realMoUpfV2Fhi);
      expect(pp.pswfc.length).toBe(0);
    });
  });
});
