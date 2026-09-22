import { describe, it, expect } from "vitest";

import {
  detectFormat,
  parse,
  serialize,
  convert,
  canSerialize,
} from "@/core/io/pseudo/registry";
import { toGTH } from "@/core/io/pseudo/gth";

import { heNcUpf, hUsppUpf } from "./teststrings/upf";
import { realHPsp8 } from "./teststrings/psp8";
import { realHFhi } from "./teststrings/fhi";
import { realHPsml } from "./teststrings/psml";
import { realHGthPbe } from "./teststrings/gth";
import { realMoUpfV2Fhi } from "./teststrings/upf";

describe("registry", () => {
  describe("detectFormat", () => {
    it("detects UPF2", () => {
      expect(detectFormat(heNcUpf)).toBe("UPF2");
      expect(detectFormat(realMoUpfV2Fhi)).toBe("UPF2");
    });

    it("detects UPF1", () => {
      expect(detectFormat("     0\n<PP_HEADER>\n'H'\n</PP_HEADER>")).toBe("UPF1");
    });

    it("detects PSP8", () => {
      expect(detectFormat(realHPsp8)).toBe("PSP8");
    });

    it("detects CPI (.fhi envelope and raw .cpi)", () => {
      expect(detectFormat(realHFhi)).toBe("CPI");
    });

    it("detects PSML", () => {
      expect(detectFormat(realHPsml)).toBe("PSML");
    });

    it("detects GTH", () => {
      expect(detectFormat(realHGthPbe)).toBe("GTH");
    });

    it("throws on unknown input", () => {
      expect(() => detectFormat("just some text\nmore text")).toThrow(
        "Unknown pseudopotential format",
      );
      expect(() => detectFormat("")).toThrow();
    });
  });

  describe("parse", () => {
    it("dispatches to the right adapter", () => {
      expect(parse(heNcUpf).format).toBe("UPF2");
      expect(parse(realHPsp8).format).toBe("PSP8");
      expect(parse(realHFhi).format).toBe("CPI");
      expect(parse(realHPsml).format).toBe("PSML");
      expect(parse(realHGthPbe).format).toBe("GTH");
    });

    it("honors an explicit format", () => {
      expect(parse(heNcUpf, "UPF2").header.element).toBe("He");
    });
  });

  describe("serialize", () => {
    it("defaults to UPF2", () => {
      expect(serialize(parse(realHPsp8))).toContain("<UPF");
    });

    it("round-trips each format through the registry", () => {
      expect(parse(serialize(parse(realHPsp8), "PSP8"), "PSP8").header.element).toBe("H");
      expect(parse(serialize(parse(heNcUpf), "UPF2"), "UPF2").header.element).toBe("He");
    });
  });

  describe("convert", () => {
    it("converts PSP8 text to UPF2", () => {
      const upf = convert(realHPsp8, "UPF2");
      const pp = parse(upf, "UPF2");
      expect(pp.header.element).toBe("H");
      expect(pp.header.zValence).toBeCloseTo(1.0);
    });

    it("converts UPF2 NC text to PSP8", () => {
      const psp8 = convert(heNcUpf, "PSP8");
      expect(detectFormat(psp8)).toBe("PSP8");
    });
  });

  describe("canSerialize", () => {
    it("allows UPF2 for everything", () => {
      expect(canSerialize(parse(hUsppUpf), "UPF2").ok).toBe(true);
    });

    it("rejects US/PAW for PSP8 with reasons", () => {
      const check = canSerialize(parse(hUsppUpf), "PSP8");
      expect(check.ok).toBe(false);
      expect(check.reasons.length).toBeGreaterThan(0);
    });

    it("accepts NC for PSP8", () => {
      expect(canSerialize(parse(heNcUpf), "PSP8").ok).toBe(true);
    });

    it("rejects tabulated-only objects for GTH", () => {
      expect(canSerialize(parse(heNcUpf), "GTH").ok).toBe(false);
      expect(() => toGTH(parse(heNcUpf))).toThrow(
        "cannot be inverted to GTH form",
      );
    });

    it("accepts GTH objects for GTH", () => {
      expect(canSerialize(parse(realHGthPbe), "GTH").ok).toBe(true);
    });
  });
});
