import { describe, it, expect } from "vitest";

import {
  detectFormat,
  parse,
  serialize,
  convert,
  canSerialize,
} from "@/core/io/pseudo/registry";
import { toGTH } from "@/core/io/pseudo/gth";
import { toFHI } from "@/core/io/pseudo/fhi";
import { fromUPF } from "@/core/io/pseudo/upf";
import type { PseudopotentialFormat } from "@/core/pseudopotential/pseudopotential";

import { heNcUpf, hUsppUpf } from "./teststrings/upf";
import { realHPsp8 } from "./teststrings/psp8";
import { realHFhi, realCFhi } from "./teststrings/fhi";
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

    it("detects preamble-less Vanderbilt UPF1 (SSSP uspp style)", () => {
      const text = [
        "<PP_INFO>",
        "Generated using Vanderbilt code",
        "</PP_INFO>",
        "<PP_HEADER>",
        "  V                    Element",
        "</PP_HEADER>",
      ].join("\n");
      expect(detectFormat(text)).toBe("UPF1");
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

    it("detects HGH separately from GTH", () => {
      const hgh = realHGthPbe.replace("GTH-PBE", "HGH-PBE");
      expect(detectFormat(hgh)).toBe("HGH");
      expect(parse(hgh).format).toBe("HGH");
    });

    it("detects raw numeric .cpi bodies", () => {
      const cpi = toFHI(parse(realCFhi));
      expect(detectFormat(cpi)).toBe("CPI");
      expect(parse(cpi).format).toBe("CPI");
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

    it("parses UPF1 explicitly", () => {
      const upf1 = serialize(parse(heNcUpf), "UPF1");
      const pp = parse(upf1, "UPF1");
      expect(pp.format).toBe("UPF1");
      expect(pp.header.element).toBe("He");
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

    it("dispatches every format explicitly", () => {
      const upf = parse(heNcUpf);
      expect(detectFormat(serialize(upf, "UPF1"))).toBe("UPF1");
      expect(detectFormat(serialize(upf, "PSP8"))).toBe("PSP8");
      expect(detectFormat(serialize(upf, "PSML"))).toBe("PSML");
      expect(detectFormat(serialize(upf, "CPI"))).toBe("CPI");
      const gth = parse(realHGthPbe);
      expect(detectFormat(serialize(gth, "GTH"))).toBe("GTH");
      expect(detectFormat(serialize(gth, "HGH"))).toBe("GTH");
    });

    it("throws on unknown formats", () => {
      const pp = parse(heNcUpf);
      const bogus = "BOGUS" as PseudopotentialFormat;
      expect(() => parse(heNcUpf, bogus)).toThrow("Unsupported pseudopotential format");
      expect(() => serialize(pp, bogus)).toThrow("Unsupported pseudopotential format");
      expect(canSerialize(pp, bogus)).toEqual({ ok: false, reasons: expect.any(Array) });
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
    it("allows UPF2 and UPF1 for everything", () => {
      expect(canSerialize(parse(hUsppUpf), "UPF2").ok).toBe(true);
      expect(canSerialize(parse(hUsppUpf), "UPF1").ok).toBe(true);
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

    it("covers every adapter arm", () => {
      expect(canSerialize(parse(realHPsml), "PSML").ok).toBe(true);
      expect(canSerialize(parse(realHFhi), "CPI").ok).toBe(true);
      expect(canSerialize(parse(hUsppUpf), "CPI").ok).toBe(false);
      expect(canSerialize(parse(realHGthPbe), "HGH").ok).toBe(true);
    });
  });
});
