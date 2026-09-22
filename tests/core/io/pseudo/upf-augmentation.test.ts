import { describe, it, expect } from "vitest";

import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { validate } from "@/core/pseudopotential/validate";

import * as fixtures from "./teststrings/upf";

describe("UPF augmentation data", () => {
  describe("H USPP (GBRV) PP_AUGMENTATION", () => {
    const pp = fromUPF(fixtures.hUsppUpf);

    it("parses augmentation block", () => {
      expect(pp.nonlocal.augmentation).toBeDefined();
    });

    it("parses q_with_l and nqf attributes", () => {
      expect(pp.nonlocal.augmentation!.qWithL).toBe(true);
      expect(pp.nonlocal.augmentation!.nqf).toBe(0);
      expect(pp.nonlocal.nqf).toBe(0);
    });

    it("parses all PP_QIJL functions with indices", () => {
      const qijl = pp.nonlocal.augmentation!.qijl!;
      expect(qijl.length).toBe(3);
      expect(qijl[0]).toMatchObject({ i: 1, j: 1, l: 0 });
      expect(qijl[1]).toMatchObject({ i: 1, j: 2, l: 0 });
      expect(qijl[2]).toMatchObject({ i: 2, j: 2, l: 0 });
      for (const q of qijl) {
        expect(q.qijl.length).toBe(615);
      }
    });

    it("parses PP_Q norms", () => {
      expect(pp.nonlocal.augmentation!.q).toBeDefined();
      expect(pp.nonlocal.augmentation!.q!.length).toBeGreaterThan(0);
    });

    it("validates cleanly", () => {
      expect(validate(pp)).toEqual([]);
    });

    it("round-trips augmentation losslessly", () => {
      const c = fromUPF(toUPF(pp));
      expect(c.nonlocal.augmentation).toEqual(pp.nonlocal.augmentation);
      expect(c).toEqual(pp);
    });
  });

  describe("O PAW (PSLibrary) PP_AUGMENTATION", () => {
    const pp = fromUPF(fixtures.oPawUpf);

    it("parses QIJL functions", () => {
      const qijl = pp.nonlocal.augmentation!.qijl!;
      expect(qijl.length).toBeGreaterThan(0);
      for (const q of qijl) {
        expect(q.qijl.length).toBe(1095);
      }
    });

    it("round-trips augmentation losslessly", () => {
      const c = fromUPF(toUPF(pp));
      expect(c.nonlocal.augmentation).toEqual(pp.nonlocal.augmentation);
    });
  });

  describe("PP_INPUTFILE", () => {
    it("preserves input-file content on round-trip", () => {
      const pp = fromUPF(fixtures.oPawUpf);
      expect(pp.inputFile).toBeDefined();
      expect(pp.inputFile!.length).toBeGreaterThan(0);
      const c = fromUPF(toUPF(pp));
      expect(c.inputFile).toBe(pp.inputFile);
    });

    it("is undefined when the source has no PP_INPUTFILE", () => {
      const pp = fromUPF(fixtures.realMoUpfV2Fhi);
      expect(pp.inputFile).toBeUndefined();
    });
  });

  describe("first-class metadata", () => {
    it("sets format, units and provenance", () => {
      const pp = fromUPF(fixtures.heNcUpf);
      expect(pp.format).toBe("UPF2");
      expect(pp.version).toBe("2.0.1");
      expect(pp.units).toEqual({ energy: "Ry", length: "Bohr" });
      expect(pp.provenance).toMatchObject({ sourceFormat: "UPF2" });
    });

    it("parses beta index attributes", () => {
      const pp = fromUPF(fixtures.heNcUpf);
      expect(pp.nonlocal.betas[0].index).toBe(1);
      expect(pp.nonlocal.betas[1].index).toBe(2);
    });
  });
});
