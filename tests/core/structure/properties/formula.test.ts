import { describe, expect, it } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";

import {
  composition,
  hillFormula,
  reducedFormula,
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
