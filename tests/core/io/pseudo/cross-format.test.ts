/**
 * Cross-format round-trip tests: every adapter converts through the
 * first-class Pseudopotential object with UPF2 as the lossless hub.
 *
 * Two nets are cast here:
 * 1. Hub round trips (FORMAT → UPF2 → FORMAT) — strict IR equality modulo
 *    fields the intermediate format cannot represent (documented per pair).
 * 2. Serialization idempotence — serialize(parse(serialize(parse(x))))
 *    is byte-identical to serialize(parse(x)).
 */

import { describe, it, expect } from "vitest";

import type { Pseudopotential } from "@/core/pseudopotential/pseudopotential";
import { fromUPF, toUPF } from "@/core/io/pseudo/upf";
import { fromUPFv1, toUPFv1 } from "@/core/io/pseudo/upf-v1";
import { fromPSP8, toPSP8 } from "@/core/io/pseudo/psp8";
import { fromFHI, toFHI } from "@/core/io/pseudo/fhi";
import { fromPSML, toPSML } from "@/core/io/pseudo/psml";
import { fromGTH, toGTH } from "@/core/io/pseudo/gth";
import { canSerialize } from "@/core/io/pseudo/registry";

import { heNcUpf } from "./teststrings/upf";
import { realHPsp8, realCPsp8 } from "./teststrings/psp8";
import { realHFhi, realCFhi, realLiFhi } from "./teststrings/fhi";
import { realHPsml, realCPsml, realOPsml } from "./teststrings/psml";
import { realCGthPbe } from "./teststrings/gth";

/** Drop ABINIT-header trivia that has no UPF representation. */
function dropAbinitTrivia(pp: Pseudopotential): Pseudopotential {
  const header = { ...pp.header };
  delete header.r2well;
  delete header.rchrg;
  delete header.fchrg;
  delete header.qchrg;
  return { ...pp, header };
}

/** Drop FHI-envelope metadata that raw .cpi cannot carry. */
function dropFhiEnvelope(pp: Pseudopotential): Pseudopotential {
  const header = { ...dropAbinitTrivia(pp).header };
  delete header.xcCode;
  return {
    ...pp,
    header: { ...header, element: "", functional: "" },
    provenance: { sourceFormat: "CPI" },
  };
}

function expectIdempotent(
  parse: (text: string) => Pseudopotential,
  serialize: (pp: Pseudopotential) => string,
  text: string,
): void {
  const once = serialize(parse(text));
  expect(serialize(parse(once))).toBe(once);
}

describe("cross-format round trips via the UPF2 hub", () => {
  describe("PSP8 → UPF2 → PSP8", () => {
    it.each([
      ["H", realHPsp8],
      ["C", realCPsp8],
    ])("%s survives the hub with only ABINIT trivia lost", (_label, text) => {
      const a = fromPSP8(text);
      const b = fromPSP8(toPSP8(fromUPF(toUPF(a))));
      expect(dropAbinitTrivia(b)).toEqual(dropAbinitTrivia(a));
    });

    it("preserves XC code through the functional name", () => {
      const a = fromPSP8(realHPsp8);
      const b = fromPSP8(toPSP8(fromUPF(toUPF(a))));
      expect(b.header.xcCode).toBe(a.header.xcCode);
    });
  });

  describe("FHI → UPF2 → FHI", () => {
    it.each([
      ["H", realHFhi],
      ["C", realCFhi],
      ["Li (NLCC)", realLiFhi],
    ])("%s survives the hub with only envelope metadata lost", (_label, text) => {
      const a = fromFHI(text);
      const b = fromFHI(toFHI(fromUPF(toUPF(a))));
      expect(dropFhiEnvelope(b)).toEqual(dropFhiEnvelope(a));
    });
  });

  describe("PSML → UPF2 → PSML", () => {
    it.each([
      ["H", realHPsml],
      ["C", realCPsml],
      ["O", realOPsml],
    ])("%s round-trips losslessly through the hub", (_label, text) => {
      const a = fromPSML(text);
      const b = fromPSML(toPSML(fromUPF(toUPF(a))));
      expect(b).toEqual(a);
    });
  });

  describe("GTH → UPF2 grid preservation", () => {
    it("keeps the evaluated tabulation (analytical params stay GTH-only)", () => {
      const a = fromGTH(realCGthPbe);
      const b = fromUPF(toUPF(a));
      // Grid values cross 16-digit D-notation text: compare with tolerance.
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      for (let i = 0; i < a.mesh.r.length; i += 25) {
        expect(b.mesh.r[i]).toBeCloseTo(a.mesh.r[i], 12);
        expect(b.local.vloc[i]).toBeCloseTo(a.local.vloc[i], 12);
      }
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      for (let i = 0; i < a.nonlocal.betas.length; i++) {
        for (let k = 0; k < a.mesh.r.length; k += 50) {
          expect(b.nonlocal.betas[i].beta[k]).toBeCloseTo(
            a.nonlocal.betas[i].beta[k],
            12,
          );
        }
      }
      for (const [nb, mb, val] of a.nonlocal.dij) {
        const found = b.nonlocal.dij.find(([x, y]) => x === nb && y === mb);
        expect(found).toBeDefined();
        expect(found![2]).toBeCloseTo(val, 12);
      }
      expect(b.gth).toBeUndefined();
    });

    it("reports that tabulated data cannot go back to GTH", () => {
      const b = fromUPF(toUPF(fromGTH(realCGthPbe)));
      expect(canSerialize(b, "GTH").ok).toBe(false);
    });
  });

  describe("UPF2 (NC) → PSP8 → UPF2", () => {
    it("preserves He NC data modulo wavefunctions", () => {
      const a = fromUPF(heNcUpf);
      const b = fromUPF(toUPF(fromPSP8(toPSP8(a))));
      expect(b.header.element).toBe("He");
      expect(b.header.zValence).toBeCloseTo(a.header.zValence, 10);
      expect(b.header.lMax).toBe(a.header.lMax);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      for (let i = 0; i < a.local.vloc.length; i += 50) {
        expect(b.local.vloc[i]).toBeCloseTo(a.local.vloc[i], 8);
      }
      for (const [nb, mb, val] of a.nonlocal.dij) {
        const found = b.nonlocal.dij.find(([x, y]) => x === nb && y === mb);
        expect(found).toBeDefined();
        expect(found![2]).toBeCloseTo(val, 8);
      }
    });
  });

  describe("UPF1 synthetic round trip", () => {
    it("preserves He NC tabulated data through UPFv1 text", () => {
      const a = fromUPF(heNcUpf);
      const b = fromUPFv1(toUPFv1(a));
      expect(b.header.element).toBe("He");
      expect(b.header.pseudoType).toBe("NC");
      expect(b.header.zValence).toBeCloseTo(a.header.zValence, 8);
      expect(b.mesh.r.length).toBe(a.mesh.r.length);
      expect(b.local.vloc.length).toBe(a.local.vloc.length);
      expect(b.nonlocal.betas.length).toBe(a.nonlocal.betas.length);
      expect(b.nonlocal.dij.length).toBe(a.nonlocal.dij.length);
      expect(b.pswfc.length).toBe(a.pswfc.length);
      expect(b.rhoatom.length).toBe(a.rhoatom.length);
      for (let i = 0; i < a.local.vloc.length; i += 50) {
        expect(b.local.vloc[i]).toBeCloseTo(a.local.vloc[i], 8);
        expect(b.rhoatom[i]).toBeCloseTo(a.rhoatom[i], 8);
      }
      for (let i = 0; i < a.nonlocal.betas.length; i++) {
        expect(b.nonlocal.betas[i].angularMomentum).toBe(
          a.nonlocal.betas[i].angularMomentum,
        );
        for (let k = 0; k < a.mesh.r.length; k += 50) {
          expect(b.nonlocal.betas[i].beta[k]).toBeCloseTo(
            a.nonlocal.betas[i].beta[k],
            8,
          );
        }
      }
    });
  });
});

describe("serialization idempotence", () => {
  it.each([
    ["UPF2 He", fromUPF, toUPF, heNcUpf],
    ["PSP8 H", fromPSP8, toPSP8, realHPsp8],
    ["PSP8 C", fromPSP8, toPSP8, realCPsp8],
    ["FHI H", fromFHI, toFHI, realHFhi],
    ["FHI C", fromFHI, toFHI, realCFhi],
    ["PSML H", fromPSML, toPSML, realHPsml],
    ["PSML C", fromPSML, toPSML, realCPsml],
    ["PSML O", fromPSML, toPSML, realOPsml],
  ])("%s is byte-stable across re-parse", (_label, parse, serialize, text) => {
    expectIdempotent(parse, serialize, text);
  });
});
