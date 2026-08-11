import { describe, expect, it } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";

import {
  alphabeticalFormula,
  anonymousFormula,
  composition,
  hillFormula,
  iupacFormula,
  numAtoms,
  parseFormula,
  reducedAlphabeticalFormula,
  reducedAnonymousFormula,
  reducedFormula,
  reducedIUPACFormula,
  reducedSubscriptFormula,
  subscriptFormula,
} from "@/core/structure/properties/formula";

import { diamondCPOSCAR, layeredStructure } from "../teststrings/spglibPoscar";

import { supercell } from "@/core/structure/operations/supercell";

import {
  simpleCubic,
  simpleHexagonal,
  layeredStructure,
  mc3d_10007,
  mc3d_1011,
  diamondCPOSCAR,
} from "../teststrings/spglibPoscar";

describe("composition", () => {
  it("simple cubic", () => {
    const s = fromPOSCAR(simpleCubic);

    expect(composition(s)).toEqual({
      Na: 1,
    });

    expect(hillFormula(s)).toBe("Na");
    expect(reducedFormula(s)).toBe("Na");
  });

  it("simple hexagonal", () => {
    const s = fromPOSCAR(simpleHexagonal);

    expect(composition(s)).toEqual({
      Na: 1,
    });

    expect(hillFormula(s)).toBe("Na");
    expect(reducedFormula(s)).toBe("Na");
  });

  it("diamond", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    expect(composition(s)).toEqual({
      C: 4,
    });

    expect(hillFormula(s)).toBe("C4");
    expect(reducedFormula(s)).toBe("C");
  });

  it("layered LiCoO2", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(composition(s)).toEqual({
      Li: 1,
      Co: 1,
      O: 2,
    });

    expect(hillFormula(s)).toBe("CoLiO2");
    expect(reducedFormula(s)).toBe("CoLiO2");
  });

  it("mc3d_10007", () => {
    const s = fromPOSCAR(mc3d_10007);

    expect(composition(s)).toEqual({
      Sn: 16,
      Rh: 4,
    });

    expect(hillFormula(s)).toBe("Rh4Sn16");
    expect(reducedFormula(s)).toBe("RhSn4");
  });

  it("mc3d_1011", () => {
    const s = fromPOSCAR(mc3d_1011);

    expect(composition(s)).toEqual({
      Li: 6,
      Ca: 2,
      Mn: 2,
      N: 6,
    });

    expect(hillFormula(s)).toBe("Ca2Li6Mn2N6");
    expect(reducedFormula(s)).toBe("CaLi3MnN3");
  });
});

describe("alphabeticalFormula", () => {
  it("diamond", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    expect(alphabeticalFormula(s)).toBe("C4");
    expect(reducedAlphabeticalFormula(s)).toBe("C");
  });

  it("layered LiCoO2", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(alphabeticalFormula(s)).toBe("CoLiO2");
    expect(reducedAlphabeticalFormula(s)).toBe("CoLiO2");
  });
});

describe("iupacFormula", () => {
  it("layered LiCoO2 orders by increasing electronegativity", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(iupacFormula(s)).toBe("LiCoO2");
    expect(reducedIUPACFormula(s)).toBe("LiCoO2");
  });

  it("mc3d_10007", () => {
    const s = fromPOSCAR(mc3d_10007);

    expect(iupacFormula(s)).toBe("Sn16Rh4");
    expect(reducedIUPACFormula(s)).toBe("Sn4Rh");
  });

  it("mc3d_1011", () => {
    const s = fromPOSCAR(mc3d_1011);

    expect(iupacFormula(s)).toBe("Li6Ca2Mn2N6");
    expect(reducedIUPACFormula(s)).toBe("Li3CaMnN3");
  });
});

describe("anonymousFormula", () => {
  it("diamond", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    expect(anonymousFormula(s)).toBe("A4");
    expect(reducedAnonymousFormula(s)).toBe("A");
  });

  it("layered LiCoO2 labels by decreasing abundance", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(anonymousFormula(s)).toBe("A2BC");
    expect(reducedAnonymousFormula(s)).toBe("A2BC");
  });

  it("mc3d_10007", () => {
    const s = fromPOSCAR(mc3d_10007);

    expect(anonymousFormula(s)).toBe("A16B4");
    expect(reducedAnonymousFormula(s)).toBe("A4B");
  });

  it("mc3d_1011 breaks ties alphabetically", () => {
    const s = fromPOSCAR(mc3d_1011);

    expect(anonymousFormula(s)).toBe("A6B6C2D2");
    expect(reducedAnonymousFormula(s)).toBe("A3B3CD");
  });
});

describe("subscriptFormula", () => {
  it("diamond", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    expect(subscriptFormula(s)).toBe("C₄");
    expect(reducedSubscriptFormula(s)).toBe("C");
  });

  it("layered LiCoO2", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(subscriptFormula(s)).toBe("CoLiO₂");
    expect(reducedSubscriptFormula(s)).toBe("CoLiO₂");
  });

  it("mc3d_10007", () => {
    const s = fromPOSCAR(mc3d_10007);

    expect(subscriptFormula(s)).toBe("Rh₄Sn₁₆");
    expect(reducedSubscriptFormula(s)).toBe("RhSn₄");
  });
});

describe("parseFormula", () => {
  it("parses simple formulas", () => {
    expect(parseFormula("Fe2O3")).toEqual({ Fe: 2, O: 3 });
    expect(parseFormula("LiCoO2")).toEqual({ Li: 1, Co: 1, O: 2 });
    expect(parseFormula("NaCl")).toEqual({ Na: 1, Cl: 1 });
    expect(parseFormula("C")).toEqual({ C: 1 });
    expect(parseFormula("C4")).toEqual({ C: 4 });
  });

  it("parses bracketed groups", () => {
    expect(parseFormula("(NH4)2SO4")).toEqual({
      N: 2,
      H: 8,
      S: 1,
      O: 4,
    });

    expect(parseFormula("Fe2(SO4)3")).toEqual({ Fe: 2, S: 3, O: 12 });
    expect(parseFormula("[Al(OH)2]3")).toEqual({ Al: 3, O: 6, H: 6 });
  });

  it("parses decimal counts", () => {
    expect(parseFormula("LiNi0.8Co0.15Al0.05O2")).toEqual({
      Li: 1,
      Ni: 0.8,
      Co: 0.15,
      Al: 0.05,
      O: 2,
    });
  });

  it("parses dot and asterisk hydrate segments", () => {
    expect(parseFormula("CaSO4·2H2O")).toEqual({
      Ca: 1,
      S: 1,
      O: 6,
      H: 4,
    });

    expect(parseFormula("CaSO4*2H2O")).toEqual({
      Ca: 1,
      S: 1,
      O: 6,
      H: 4,
    });
  });

  it("accepts whitespace and Unicode subscripts", () => {
    expect(parseFormula(" Li 2 Co O 4 ")).toEqual({ Li: 2, Co: 1, O: 4 });
    expect(parseFormula("CoLiO₂")).toEqual({ Co: 1, Li: 1, O: 2 });
  });

  it("round-trips structure formulas", () => {
    for (const poscar of [simpleCubic, diamondCPOSCAR, layeredStructure, mc3d_1011]) {
      const s = fromPOSCAR(poscar);

      expect(parseFormula(hillFormula(s))).toEqual(composition(s));
    }
  });

  it("rejects malformed formulas", () => {
    expect(() => parseFormula("")).toThrow();
    expect(() => parseFormula("Fe(")).toThrow();
    expect(() => parseFormula("(Fe)O)")).toThrow();
    expect(() => parseFormula("Fe@")).toThrow();
    expect(() => parseFormula("Fe..O")).toThrow();
  });
});

describe("numAtoms", () => {
  it("counts sites", () => {
    expect(numAtoms(fromPOSCAR(simpleCubic))).toBe(1);
    expect(numAtoms(fromPOSCAR(diamondCPOSCAR))).toBe(4);
    expect(numAtoms(fromPOSCAR(mc3d_10007))).toBe(20);
    expect(numAtoms(fromPOSCAR(mc3d_1011))).toBe(16);
  });
});
