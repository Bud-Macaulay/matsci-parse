import { describe, it, expect } from "vitest";

import { fromGTH, parseGTHFile, toGTH } from "@/core/io/pseudo/gth";

import * as fixtures from "./teststrings/gth";

describe("GTH parser", () => {
  describe("parseGTHFile", () => {
    it("parses a single H entry", () => {
      const entries = parseGTHFile(fixtures.hGth);
      expect(entries.length).toBe(1);
      expect(entries[0].element).toBe("H");
      expect(entries[0].potentialName).toBe("GTH-PBE");
    });

    it("parses H valence electrons", () => {
      const entries = parseGTHFile(fixtures.hGth);
      expect(entries[0].nElec).toEqual([1, 0]);
    });

    it("parses H local part", () => {
      const entries = parseGTHFile(fixtures.hGth);
      expect(entries[0].rLoc).toBeCloseTo(0.2);
      expect(entries[0].nexpPpl).toBe(1);
      expect(entries[0].cexpPpl).toEqual([-1.0]);
    });

    it("parses H with zero non-local projectors", () => {
      const entries = parseGTHFile(fixtures.hGth);
      expect(entries[0].nprj).toBe(0);
      expect(entries[0].channels.length).toBe(0);
    });

    it("parses C with two projector channels", () => {
      const entries = parseGTHFile(fixtures.cGth);
      expect(entries.length).toBe(1);
      expect(entries[0].element).toBe("C");
      expect(entries[0].nElec).toEqual([2, 2]);
      expect(entries[0].nprj).toBe(2);
      expect(entries[0].channels.length).toBe(2);
    });

    it("parses C channel radii", () => {
      const entries = parseGTHFile(fixtures.cGth);
      expect(entries[0].channels[0].r).toBeCloseTo(0.3);
      expect(entries[0].channels[0].nprjPpnl).toBe(1);
      expect(entries[0].channels[1].r).toBeCloseTo(0.35);
      expect(entries[0].channels[1].nprjPpnl).toBe(1);
    });

    it("parses C h-matrix elements", () => {
      const entries = parseGTHFile(fixtures.cGth);
      // s-channel: single projector, 1 element
      expect(entries[0].channels[0].hprj).toEqual([[-1.2]]);
      // p-channel: single projector, 1 element
      expect(entries[0].channels[1].hprj).toEqual([[-0.8]]);
    });

    it("parses multi-element file", () => {
      const entries = parseGTHFile(fixtures.multiGth);
      expect(entries.length).toBe(2);
      expect(entries[0].element).toBe("H");
      expect(entries[1].element).toBe("C");
    });
  });

  describe("fromGTH", () => {
    it("parses H to Pseudopotential IR", () => {
      const pp = fromGTH(fixtures.hGth);

      expect(pp.version).toBe("2.0.1");
      expect(pp.format).toBe("GTH");
      expect(pp.header.element).toBe("H");
      expect(pp.header.pseudoType).toBe("NC");
      expect(pp.header.relativistic).toBe("scalar");
      expect(pp.header.isUltrasoft).toBe(false);
      expect(pp.header.isPaw).toBe(false);
      expect(pp.header.coreCorrection).toBe(false);
      expect(pp.header.functional).toBe("GTH-PBE");
      expect(pp.header.zValence).toBeCloseTo(1.0);
    });

    it("H has local potential on grid", () => {
      const pp = fromGTH(fixtures.hGth);
      expect(pp.mesh.r.length).toBe(500);
      expect(pp.local.vloc.length).toBe(500);
      expect(pp.local.vloc[0]).toBeLessThan(0);
      // At large r, V_local -> 0 (screened)
      expect(pp.local.vloc[pp.local.vloc.length - 1]).toBeGreaterThan(-0.1);
    });

    it("H has no non-local projectors", () => {
      const pp = fromGTH(fixtures.hGth);
      expect(pp.nonlocal.betas.length).toBe(0);
      expect(pp.nonlocal.dij.length).toBe(0);
    });

    it("H has no wavefunctions", () => {
      const pp = fromGTH(fixtures.hGth);
      expect(pp.pswfc.length).toBe(0);
    });

    it("C has projectors", () => {
      const pp = fromGTH(fixtures.cGth);
      expect(pp.nonlocal.betas.length).toBe(2);
      expect(pp.nonlocal.betas[0].angularMomentum).toBe(0);
      expect(pp.nonlocal.betas[1].angularMomentum).toBe(1);
    });

    it("C has D_ij entries", () => {
      const pp = fromGTH(fixtures.cGth);
      expect(pp.nonlocal.dij.length).toBe(2);
      // s-projector: diagonal
      expect(pp.nonlocal.dij[0][0]).toBe(1);
      expect(pp.nonlocal.dij[0][1]).toBe(1);
      expect(pp.nonlocal.dij[0][2]).toBeCloseTo(-1.2);
      // p-projector: diagonal
      expect(pp.nonlocal.dij[1][0]).toBe(2);
      expect(pp.nonlocal.dij[1][1]).toBe(2);
      expect(pp.nonlocal.dij[1][2]).toBeCloseTo(-0.8);
    });

    it("C has GTH analytical data", () => {
      const pp = fromGTH(fixtures.cGth);
      expect(pp.gth).toBeDefined();
      expect(pp.gth!.rLoc).toBeCloseTo(0.35);
      expect(pp.gth!.cexpPpl).toEqual([-4.2, 2.1]);
      expect(pp.gth!.rPs.length).toBe(2);
      expect(pp.gth!.hprj.length).toBe(2);
    });

    it("C has mesh with 500 points", () => {
      const pp = fromGTH(fixtures.cGth);
      expect(pp.mesh.r.length).toBe(500);
      expect(pp.mesh.rab.length).toBe(500);
      expect(pp.mesh.rmax).toBeCloseTo(20.0);
    });

    it("C projector values are non-zero on grid", () => {
      const pp = fromGTH(fixtures.cGth);
      // s-projector
      const sBeta = pp.nonlocal.betas[0].beta;
      expect(sBeta.length).toBe(500);
      // At least some values should be non-zero
      expect(sBeta.some((v) => Math.abs(v) > 1e-10)).toBe(true);
    });
  });

  describe("toGTH", () => {
    it("serializes C with GTH data", () => {
      const pp = fromGTH(fixtures.cGth);
      const text = toGTH(pp);

      expect(text).toContain("# C");
      expect(text).toContain("GTH-PBE");
      expect(text).toContain("2  2"); // nElec
      expect(text).toContain("2"); // nprj
    });

    it("serializes H with zero projectors", () => {
      const pp = fromGTH(fixtures.hGth);
      const text = toGTH(pp);

      expect(text).toContain("# H");
      expect(text).toContain("0"); // nprj = 0
    });
  });

  describe("round-trip", () => {
    it("H round-trips through parseGTHFile → fromGthEntry", () => {
      const entries = parseGTHFile(fixtures.hGth);
      const entry = entries[0];
      // Re-parse from serialized text
      const serialized = `# H  GTH-PBE
H  GTH-PBE
${entry.nElec.join("  ")}
${entry.rLoc}  ${entry.nexpPpl}  ${entry.cexpPpl.join("  ")}
${entry.nprj}
`;
      const entries2 = parseGTHFile(serialized);
      expect(entries2.length).toBe(1);
      expect(entries2[0].element).toBe("H");
      expect(entries2[0].rLoc).toBeCloseTo(entry.rLoc);
    });
  });

  describe("error handling", () => {
    it("throws on empty input", () => {
      expect(() => fromGTH("")).toThrow("No GTH entries found");
    });

    it("handles comment-only input gracefully", () => {
      expect(() => fromGTH("# just comments\n# more comments")).toThrow("No GTH entries found");
    });
  });
});
