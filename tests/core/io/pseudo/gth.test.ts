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
      // Canonical units are Ry (file values in Hartree × 2)
      expect(pp.gth!.cexpPpl[0]).toBeCloseTo(-4.04797008 * 2);
      expect(pp.gth!.cexpPpl[1]).toBeCloseTo(0.66965815 * 2);
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
      expect(pp.gth!.cexpPpl).toEqual([-9.06984697 * 2, 1.67662166 * 2]);
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

    it("h-matrix elements match submodule data (×2 for Ry)", () => {
      const pp = fromGTH(realCGthPbe);
      expect(pp.gth!.hprj[0]).toEqual([[9.86073638 * 2]]);
      expect(pp.gth!.hprj[1]).toEqual([[-0.08162373 * 2]]);
    });

    it("D_ij entries are correct", () => {
      const pp = fromGTH(realCGthPbe);
      expect(pp.nonlocal.dij.length).toBe(2);
      expect(pp.nonlocal.dij[0][2]).toBeCloseTo(9.86073638 * 2);
      expect(pp.nonlocal.dij[1][2]).toBeCloseTo(-0.08162373 * 2);
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

  describe("k-matrix (SOC) entries", () => {
    const socEntry = [
      "Xx GTH-PBE-q1",
      "    1",
      "     0.20000000    1    -4.04797008     0.66965815",
      "    1",
      "     0.30000000    1     1.50000000     0.25000000",
    ].join("\n");
    it("parses inline k-matrix with Hartree→Ry conversion", () => {
      const pp = fromGTH(socEntry);
      expect(pp.header.hasSo).toBe(true);
      expect(pp.gth!.kprj).toBeDefined();
      expect(pp.gth!.kprj![0]).toEqual([[0.25 * 2]]);
      expect(pp.gth!.hprj[0]).toEqual([[1.5 * 2]]);
    });

    it("round-trips k-matrix losslessly", () => {
      const a = fromGTH(socEntry);
      const c = fromGTH(toGTH(a));
      expect(c).toEqual(a);
    });

    it("keeps analytical params alongside the evaluated grid", () => {
      const pp = fromGTH(socEntry);
      expect(pp.provenance.analytical).toBe(true);
      expect(pp.gth).toBeDefined();
      expect(pp.local.vloc.length).toBe(500);
      expect(pp.nonlocal.betas.length).toBe(1);
    });
  });

  describe("k-matrix on later channels and trailing blocks", () => {
    const paddedEntry = [
      "Xx GTH-PBE-q2",
      "    2    0",
      "     0.20000000    1    -4.00000000",
      "    2",
      "     0.30000000    1     1.50000000",
      "     0.35000000    1     1.60000000     0.26000000",
    ].join("\n");

    it("pads kprj for channels without k data", () => {
      const [entry] = parseGTHFile(paddedEntry);
      expect(entry.hasKprj).toBe(true);
      expect(entry.kprj!.length).toBe(2);
      expect(entry.kprj![1]).toEqual([[0.26]]);
    });

    it("round-trips padded k-matrix losslessly", () => {
      const a = fromGTH(paddedEntry);
      expect(fromGTH(toGTH(a))).toEqual(a);
    });

    it("reads a trailing multi-line k block after the last channel", () => {
      const text = [
        "Xx GTH-PBE-q2",
        "    2    0",
        "     0.20000000    1    -4.00000000",
        "    2",
        "     0.30000000    1     1.50000000",
        "     0.35000000    1     1.60000000",
        "     0.26000000",
      ].join("\n");
      const [entry] = parseGTHFile(text);
      expect(entry.hasKprj).toBe(true);
      // Padding entry for the k-less first channel.
      expect(entry.kprj!.length).toBe(2);
      expect(entry.kprj![1]).toEqual([[0.26]]);
      const pp = fromGTH(text);
      expect(fromGTH(toGTH(pp))).toEqual(pp);
    });
  });

  describe("entry-boundary robustness", () => {
    it("skips comments, short lines and truncated entries", () => {
      const text = [
        "# top comment",
        "Xx GTH-PBE-q1",
        "# between header and configuration",
        "    1",
        "     0.20000000    1    -4.00000000",
        "    0",
        "lonely",
        "Ww GTH-PBE-q1",
      ].join("\n");
      const entries = parseGTHFile(text);
      expect(entries.length).toBe(1);
      expect(entries[0].element).toBe("Xx");
    });

    it("zero-fills a truncated h-matrix", () => {
      const text = [
        "Xx GTH-PBE-q1",
        "    1",
        "     0.20000000    1    -4.00000000",
        "    1",
        "     0.30000000    2     1.50000000",
      ].join("\n");
      const [entry] = parseGTHFile(text);
      expect(entry.channels[0].hprj).toEqual([
        [1.5, 0],
        [0, 0],
      ]);
    });
  });

  describe("HGH entries", () => {
    const hghEntry = [
      "Xx HGH-PBE-q1",
      "    1",
      "     0.20000000    1    -4.00000000",
      "    0",
    ].join("\n");

    it("detects the HGH format variant", () => {
      const pp = fromGTH(hghEntry);
      expect(pp.format).toBe("HGH");
      expect(pp.provenance.sourceFormat).toBe("HGH");
    });
  });

  describe("toGTH without stored configuration", () => {
    it("estimates n_elec from projectors", () => {
      const pp = fromGTH(realCGthPbe);
      const text = toGTH({
        ...pp,
        gth: { ...pp.gth!, nElec: [] },
      });
      expect(text.split("\n")).toContain("1  1");
    });

    it("falls back to rounded zValence for empty s channels", () => {
      const pp = fromGTH(realCGthPbe);
      const text = toGTH({
        ...pp,
        header: { ...pp.header, lMax: 1 },
        nonlocal: {
          ...pp.nonlocal,
          betas: pp.nonlocal.betas.filter((b) => b.angularMomentum === 1),
        },
        gth: { ...pp.gth!, nElec: [] },
      });
      expect(text.split("\n")).toContain("4  1");
    });
  });
});
