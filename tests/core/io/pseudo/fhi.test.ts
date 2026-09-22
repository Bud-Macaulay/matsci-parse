import { describe, it, expect } from "vitest";

import { fromFHI, toFHI, canWriteFHI } from "@/core/io/pseudo/fhi";
import { fromUPF } from "@/core/io/pseudo/upf";

import {
  realHFhi,
  realCFhi,
  realNFhi,
  realOFhi,
  realLiFhi,
} from "./teststrings/fhi";
import { heNcUpf, hUsppUpf, oPawUpf } from "./teststrings/upf";

describe("FHI parser", () => {
  describe("error handling", () => {
    it("throws on too-short input", () => {
      expect(() => fromFHI("line1\nline2\n")).toThrow("too short");
    });

    it("throws on empty input", () => {
      expect(() => fromFHI("")).toThrow("too short");
    });
  });

  describe("real-world .fhi files from submodule", () => {
    describe("Hydrogen (LDA Troullier-Martins, 387 mesh pts)", () => {
      const pp = fromFHI(realHFhi);

      it("parses header correctly", () => {
        expect(pp.header.element).toBe("H");
        expect(pp.header.zValence).toBeCloseTo(1.0);
        expect(pp.header.lMax).toBe(3);
        expect(pp.header.coreCorrection).toBe(false);
        expect(pp.header.meshSize).toBe(387);
      });

      it("parses mesh with expected size", () => {
        expect(pp.mesh.r.length).toBe(387);
        expect(pp.mesh.r[0]).toBeGreaterThan(0);
        expect(pp.mesh.r[386]).toBeGreaterThan(pp.mesh.r[0]);
      });

      it("has 4 semilocal components (s, p, d, f)", () => {
        expect(pp.semilocal!.length).toBe(4);
        expect(pp.semilocal![0].l).toBe(0);
        expect(pp.semilocal![1].l).toBe(1);
        expect(pp.semilocal![2].l).toBe(2);
        expect(pp.semilocal![3].l).toBe(3);
      });

      it("local potential (vloc) comes from l=0 channel", () => {
        expect(pp.local.vloc.length).toBe(387);
        expect(pp.local.vloc[0]).toBeGreaterThan(-100);
        expect(pp.local.vloc[0]).toBeLessThan(100);
      });

      it("no NLCC", () => {
        expect(pp.nlcc).toBeUndefined();
      });
    });

    describe("Carbon (LDA Troullier-Martins, 461 mesh pts)", () => {
      const pp = fromFHI(realCFhi);

      it("parses header correctly", () => {
        expect(pp.header.element).toBe("C");
        expect(pp.header.zValence).toBeCloseTo(4.0);
        expect(pp.header.lMax).toBe(3);
        expect(pp.header.meshSize).toBe(461);
      });

      it("parses mesh", () => {
        expect(pp.mesh.r.length).toBe(461);
      });

      it("has correct lMax and components", () => {
        expect(pp.semilocal!.length).toBe(4);
      });

      it("no NLCC", () => {
        expect(pp.nlcc).toBeUndefined();
      });
    });

    describe("Nitrogen (LDA Troullier-Martins, 467 mesh pts)", () => {
      const pp = fromFHI(realNFhi);

      it("parses header correctly", () => {
        expect(pp.header.element).toBe("N");
        expect(pp.header.zValence).toBeCloseTo(5.0);
        expect(pp.header.lMax).toBe(3);
        expect(pp.header.meshSize).toBe(467);
      });

      it("has local potential", () => {
        expect(pp.local.vloc.length).toBe(467);
        expect(pp.local.vloc[0]).toBeGreaterThan(-100);
        expect(pp.local.vloc[0]).toBeLessThan(100);
      });

      it("no NLCC", () => {
        expect(pp.nlcc).toBeUndefined();
      });
    });

    describe("Oxygen (LDA Troullier-Martins, 473 mesh pts)", () => {
      const pp = fromFHI(realOFhi);

      it("parses header correctly", () => {
        expect(pp.header.element).toBe("O");
        expect(pp.header.zValence).toBeCloseTo(6.0);
        expect(pp.header.lMax).toBe(3);
        expect(pp.header.meshSize).toBe(473);
      });

      it("has local potential", () => {
        expect(pp.local.vloc.length).toBe(473);
      });
    });

    describe("Lithium (LDA Troullier-Martins, 433 mesh pts)", () => {
      const pp = fromFHI(realLiFhi);

      it("parses header correctly", () => {
        expect(pp.header.element).toBe("Li");
        expect(pp.header.zValence).toBeCloseTo(1.0);
        expect(pp.header.meshSize).toBe(433);
      });

      it("parses mesh with expected size", () => {
        expect(pp.mesh.r.length).toBe(433);
      });
    });
  });

  describe("element handling", () => {
    it("parses element from .fhi ABINIT header line 2", () => {
      expect(fromFHI(realHFhi).header.element).toBe("H");
      expect(fromFHI(realCFhi).header.element).toBe("C");
      expect(fromFHI(realNFhi).header.element).toBe("N");
      expect(fromFHI(realOFhi).header.element).toBe("O");
      expect(fromFHI(realLiFhi).header.element).toBe("Li");
    });

    it("does not guess element from zValence for .cpi content", () => {
      // CPI format has no element info; element should be empty
      const cpi = toFHI(fromFHI(realCFhi));
      const reparsed = fromFHI(cpi);
      expect(reparsed.header.element).toBe("");
    });
  });

  describe("serialization", () => {
    it("round-trips real H .fhi → .cpi", () => {
      const a = fromFHI(realHFhi);
      const cpi = toFHI(a);
      const b = fromFHI(cpi);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.header.meshSize).toBe(a.header.meshSize);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
    });

    it("round-trips real C .fhi → .cpi", () => {
      const a = fromFHI(realCFhi);
      const cpi = toFHI(a);
      const b = fromFHI(cpi);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.header.meshSize).toBe(a.header.meshSize);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
    });

    it("round-trips real N .fhi → .cpi", () => {
      const a = fromFHI(realNFhi);
      const cpi = toFHI(a);
      const b = fromFHI(cpi);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.header.meshSize).toBe(a.header.meshSize);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
    });

    it("round-trips real O .fhi → .cpi", () => {
      const a = fromFHI(realOFhi);
      const cpi = toFHI(a);
      const b = fromFHI(cpi);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.header.meshSize).toBe(a.header.meshSize);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
    });

    it("round-trips real Li .fhi → .cpi", () => {
      const a = fromFHI(realLiFhi);
      const cpi = toFHI(a);
      const b = fromFHI(cpi);
      expect(b.header.zValence).toBeCloseTo(a.header.zValence);
    });
  });

  describe("raw .cpi edge cases", () => {
    const zeros = Array.from(
      { length: 9 },
      () => "  0.0000    0.0000    0.0000   0.0000",
    );

    it("throws on numeric input that is too short", () => {
      expect(() => fromFHI("1.0000 2\n3")).toThrow("too short");
    });

    it("skips short junk lines in the header scan and data block", () => {
      const text = [
        "4.0000  2",
        ...zeros.slice(0, 8),
        "oops",
        zeros[8],
        "  3  0.01",
        "junk",
        "  1  0.01  -1.0  -0.9",
        "  2  0.02  -0.8  -0.7",
        "  3  0.03  -0.6  -0.5",
      ].join("\n");
      const pp = fromFHI(text);
      expect(pp.mesh.r.length).toBe(3);
      expect(Array.from(pp.local.vloc)).toEqual([-2.0, -1.6, -1.2]);
    });

    it("reads NLCC columns and writes them back", () => {
      const text = [
        "4.0000  2",
        ...zeros,
        "  3  0.01",
        "  1  0.01  -1.0  -0.9  0.001",
        "  2  0.02  -0.8  -0.7  0.002",
        "  3  0.03  -0.6  -0.5  0.003",
      ].join("\n");
      const a = fromFHI(text);
      expect(a.header.coreCorrection).toBe(true);
      expect(Array.from(a.nlcc!)).toEqual([0.001, 0.002, 0.003]);
      expect(fromFHI(toFHI(a))).toEqual(a);
    });

    it("handles a degenerate single-channel mesh", () => {
      const text = ["4.0000  0", ...zeros, "  1  0.01"].join("\n");
      const pp = fromFHI(text);
      expect(pp.mesh.r.length).toBe(0);
      expect(pp.local.vloc.length).toBe(0);
    });
  });

  describe("toFHI from non-FHI objects", () => {
    it("replicates the local potential across channels", () => {
      const a = fromUPF(heNcUpf);
      expect(a.semilocal).toBeUndefined();
      const b = fromFHI(toFHI(a));
      expect(b.semilocal!.length).toBe(1);
      expect(Array.from(b.semilocal![0].vnl)).toEqual(Array.from(b.local.vloc));
    });

    it("omits channels missing from semilocal", () => {
      const a = fromFHI(realCFhi);
      const dropped = {
        ...a,
        semilocal: a.semilocal!.filter((s) => s.l !== 1),
      };
      const b = fromFHI(toFHI(dropped));
      expect(Array.from(b.semilocal!.find((s) => s.l === 1)!.vnl)).toEqual(
        new Array(b.mesh.r.length).fill(0),
      );
    });

    it("defaults a missing dx to 0.01", () => {
      const a = fromUPF(heNcUpf);
      const b = fromFHI(toFHI({ ...a, mesh: { ...a.mesh, dx: undefined } }));
      expect(b.mesh.dx).toBeCloseTo(0.01);
    });
  });

  describe("canWriteFHI", () => {
    it("accepts norm-conserving semilocal objects", () => {
      expect(canWriteFHI(fromFHI(realCFhi)).ok).toBe(true);
    });

    it("rejects US/PAW/KB content with reasons", () => {
      expect(canWriteFHI(fromUPF(hUsppUpf)).ok).toBe(false);
      const kb = canWriteFHI(fromUPF(heNcUpf));
      expect(kb.ok).toBe(false);
      expect(kb.reasons.join(" ")).toContain("KB projectors");
    });

    it("rejects spin-orbit and PAW data with reasons", () => {
      const base = fromFHI(realCFhi);
      const so = {
        ...base,
        header: { ...base.header, hasSo: true },
        spinOrbit: { relWfcs: [], relBetas: [] },
      };
      expect(canWriteFHI(so).reasons.join(" ")).toContain("spin-orbit");
      expect(canWriteFHI(fromUPF(oPawUpf)).reasons.join(" ")).toContain("PAW");
    });
  });
});
