import { describe, it, expect } from "vitest";

import { fromGTH, parseGTHFile, toGTH } from "@/core/io/pseudo/gth";

import {
  realHGthPbe,
  realHeGthPbe,
  realCGthPbe,
  realNGthPbe,
  realOGthPbe,
  realMultiGth,
} from "./teststrings/gth";

describe("GTH parser", () => {
  describe("error handling", () => {
    it("throws on empty input", () => {
      expect(() => fromGTH("")).toThrow("No GTH entries found");
    });

    it("handles comment-only input gracefully", () => {
      expect(() => fromGTH("# just comments\n# more comments")).toThrow(
        "No GTH entries found",
      );
    });
  });

  describe("real-world H GTH-PBE from submodule", () => {
    it("parses correctly", () => {
      const pp = fromGTH(realHGthPbe);
      expect(pp.header.element).toBe("H");
      expect(pp.header.zValence).toBeCloseTo(1.0);
      expect(pp.header.functional).toBe("GTH-PBE-q1");
      expect(pp.format).toBe("GTH");
    });

    it("has local potential with correct rLoc", () => {
      const pp = fromGTH(realHGthPbe);
      expect(pp.gth).toBeDefined();
      expect(pp.gth!.rLoc).toBeCloseTo(0.2);
      expect(pp.gth!.cexpPpl.length).toBe(2);
      expect(pp.gth!.cexpPpl[0]).toBeCloseTo(-4.04797008);
      expect(pp.gth!.cexpPpl[1]).toBeCloseTo(0.66965815);
    });

    it("has no non-local projectors", () => {
      const pp = fromGTH(realHGthPbe);
      expect(pp.nonlocal.betas.length).toBe(0);
      expect(pp.nonlocal.dij.length).toBe(0);
    });

    it("has mesh of 500 points", () => {
      const pp = fromGTH(realHGthPbe);
      expect(pp.mesh.r.length).toBe(500);
      expect(pp.local.vloc.length).toBe(500);
    });

    it("local potential is negative near origin", () => {
      const pp = fromGTH(realHGthPbe);
      expect(pp.local.vloc[5]).toBeLessThan(0);
    });
  });

  describe("real-world He GTH-PBE from submodule", () => {
    it("parses correctly", () => {
      const pp = fromGTH(realHeGthPbe);
      expect(pp.header.element).toBe("He");
      expect(pp.header.zValence).toBeCloseTo(2.0);
      expect(pp.gth!.rLoc).toBeCloseTo(0.2);
      expect(pp.gth!.cexpPpl).toEqual([-9.06984697, 1.67662166]);
    });
  });

  describe("real-world C GTH-PBE from submodule", () => {
    it("parses correctly", () => {
      const pp = fromGTH(realCGthPbe);
      expect(pp.header.element).toBe("C");
      expect(pp.header.zValence).toBeCloseTo(4.0);
      expect(pp.header.functional).toBe("GTH-PBE-q4");
    });

    it("has 2 beta projectors (s and p)", () => {
      const pp = fromGTH(realCGthPbe);
      expect(pp.nonlocal.betas.length).toBe(2);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(1);
    });

    it("has correct GTH parameters", () => {
      const pp = fromGTH(realCGthPbe);
      expect(pp.gth!.rLoc).toBeCloseTo(0.33);
      expect(pp.gth!.cexpPpl.length).toBe(2);
      expect(pp.gth!.rPs.length).toBe(2);
      expect(pp.gth!.rPs[0]).toBeCloseTo(0.29798008);
      expect(pp.gth!.rPs[1]).toBeCloseTo(0.35634007);
    });

    it("h-matrix elements match submodule data", () => {
      const pp = fromGTH(realCGthPbe);
      expect(pp.gth!.hprj[0]).toEqual([[9.86073638]]);
      expect(pp.gth!.hprj[1]).toEqual([[-0.08162373]]);
    });

    it("D_ij entries are correct", () => {
      const pp = fromGTH(realCGthPbe);
      expect(pp.nonlocal.dij.length).toBe(2);
      expect(pp.nonlocal.dij[0][2]).toBeCloseTo(9.86073638);
      expect(pp.nonlocal.dij[1][2]).toBeCloseTo(-0.08162373);
    });
  });

  describe("real-world N GTH-PBE from submodule", () => {
    it("parses correctly", () => {
      const pp = fromGTH(realNGthPbe);
      expect(pp.header.element).toBe("N");
      expect(pp.header.zValence).toBeCloseTo(5.0);
      expect(pp.nonlocal.betas.length).toBe(2);
      expect(pp.gth!.rLoc).toBeCloseTo(0.38);
    });
  });

  describe("real-world O GTH-PBE from submodule", () => {
    it("parses correctly", () => {
      const pp = fromGTH(realOGthPbe);
      expect(pp.header.element).toBe("O");
      expect(pp.header.zValence).toBeCloseTo(6.0);
      expect(pp.nonlocal.betas.length).toBe(2);
    });
  });

  describe("real-world multi-element GTH file", () => {
    it("parses 3 entries", () => {
      const entries = parseGTHFile(realMultiGth);
      expect(entries.length).toBe(3);
      expect(entries[0].element).toBe("H");
      expect(entries[1].element).toBe("He");
      expect(entries[2].element).toBe("C");
    });

    it("parses first entry", () => {
      const pp = fromGTH(realMultiGth);
      expect(pp.header.element).toBe("H");
    });
  });

  describe("real-world round-trip", () => {
    it("H GTH round-trips losslessly", () => {
      const a = fromGTH(realHGthPbe);
      const c = fromGTH(toGTH(a));
      expect(c).toEqual(a);
    });

    it("C GTH round-trips losslessly", () => {
      const a = fromGTH(realCGthPbe);
      const c = fromGTH(toGTH(a));
      expect(c).toEqual(a);
    });
  });
});
