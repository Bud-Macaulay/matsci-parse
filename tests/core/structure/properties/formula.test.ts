import { describe, expect, it } from "vitest";

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

import {
  ALL_STRUCTURES,
  poSC,
  graphite,
  siDiamond,
  srTiO3,
  tiO2Rutile,
  al2O3Corundum,
  zrO2Baddeleyite,
} from "../../../fixtures/structures";

describe("composition", () => {
  it("simple cubic Po", () => {
    expect(composition(poSC)).toEqual({ Po: 1 });
    expect(hillFormula(poSC)).toBe("Po");
    expect(reducedFormula(poSC)).toBe("Po");
  });

  it("graphite", () => {
    expect(composition(graphite)).toEqual({ C: 4 });
    expect(hillFormula(graphite)).toBe("C4");
    expect(reducedFormula(graphite)).toBe("C");
  });

  it("diamond Si", () => {
    expect(composition(siDiamond)).toEqual({ Si: 8 });
    expect(hillFormula(siDiamond)).toBe("Si8");
    expect(reducedFormula(siDiamond)).toBe("Si");
  });

  it("perovskite SrTiO3", () => {
    expect(composition(srTiO3)).toEqual({ Sr: 1, Ti: 1, O: 3 });
    expect(hillFormula(srTiO3)).toBe("O3SrTi");
    expect(reducedFormula(srTiO3)).toBe("O3SrTi");
  });

  it("corundum Al2O3", () => {
    expect(composition(al2O3Corundum)).toEqual({ Al: 4, O: 6 });
    expect(hillFormula(al2O3Corundum)).toBe("Al4O6");
    expect(reducedFormula(al2O3Corundum)).toBe("Al2O3");
  });

  it("monoclinic ZrO2", () => {
    expect(composition(zrO2Baddeleyite)).toEqual({ Zr: 4, O: 8 });
    expect(hillFormula(zrO2Baddeleyite)).toBe("O8Zr4");
    expect(reducedFormula(zrO2Baddeleyite)).toBe("O2Zr");
  });
});

describe("alphabeticalFormula", () => {
  it("diamond Si", () => {
    expect(alphabeticalFormula(siDiamond)).toBe("Si8");
    expect(reducedAlphabeticalFormula(siDiamond)).toBe("Si");
  });

  it("perovskite SrTiO3", () => {
    expect(alphabeticalFormula(srTiO3)).toBe("O3SrTi");
    expect(reducedAlphabeticalFormula(srTiO3)).toBe("O3SrTi");
  });
});

describe("iupacFormula", () => {
  it("SrTiO3 orders by increasing electronegativity", () => {
    expect(iupacFormula(srTiO3)).toBe("SrTiO3");
    expect(reducedIUPACFormula(srTiO3)).toBe("SrTiO3");
  });

  it("rutile TiO2", () => {
    expect(iupacFormula(tiO2Rutile)).toBe("Ti2O4");
    expect(reducedIUPACFormula(tiO2Rutile)).toBe("TiO2");
  });

  it("monoclinic ZrO2", () => {
    expect(iupacFormula(zrO2Baddeleyite)).toBe("Zr4O8");
    expect(reducedIUPACFormula(zrO2Baddeleyite)).toBe("ZrO2");
  });
});

describe("anonymousFormula", () => {
  it("diamond Si", () => {
    expect(anonymousFormula(siDiamond)).toBe("A8");
    expect(reducedAnonymousFormula(siDiamond)).toBe("A");
  });

  it("SrTiO3 labels by decreasing abundance, ties alphabetically", () => {
    expect(anonymousFormula(srTiO3)).toBe("A3BC");
    expect(reducedAnonymousFormula(srTiO3)).toBe("A3BC");
  });

  it("corundum Al2O3", () => {
    expect(anonymousFormula(al2O3Corundum)).toBe("A6B4");
    expect(reducedAnonymousFormula(al2O3Corundum)).toBe("A3B2");
  });

  it("monoclinic ZrO2", () => {
    expect(anonymousFormula(zrO2Baddeleyite)).toBe("A8B4");
    expect(reducedAnonymousFormula(zrO2Baddeleyite)).toBe("A2B");
  });
});

describe("subscriptFormula", () => {
  it("diamond Si", () => {
    expect(subscriptFormula(siDiamond)).toBe("Si₈");
    expect(reducedSubscriptFormula(siDiamond)).toBe("Si");
  });

  it("perovskite SrTiO3", () => {
    expect(subscriptFormula(srTiO3)).toBe("O₃SrTi");
    expect(reducedSubscriptFormula(srTiO3)).toBe("O₃SrTi");
  });

  it("monoclinic ZrO2", () => {
    expect(subscriptFormula(zrO2Baddeleyite)).toBe("O₈Zr₄");
    expect(reducedSubscriptFormula(zrO2Baddeleyite)).toBe("O₂Zr");
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
    for (const s of Object.values(ALL_STRUCTURES)) {
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
    expect(numAtoms(poSC)).toBe(1);
    expect(numAtoms(siDiamond)).toBe(8);
    expect(numAtoms(al2O3Corundum)).toBe(10);
    expect(numAtoms(zrO2Baddeleyite)).toBe(12);
  });
});
