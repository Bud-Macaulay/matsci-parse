import { describe, it, expect } from "vitest";
import { Structure } from "@/core/structure/structure";
import { replaceSite } from "@/core/structure/operations/sites/replaceSite";
import { calculateNdPattern, NdOptions } from "@/core/structure/analysis/diffraction/neutron/neutron";
import { LiFePO4, Li10GeP2S12 } from "../xrd/teststrings/structures";
import { csCl as CsCl, graphite as Graphite } from "../../../../../fixtures/structures";
import {
  expectHklsClose,
  expectPatternClose,
  loadPatterns,
} from "../../../../../helpers/diffraction";

const structures: Record<string, Structure> = {
  CsCl,
  LiFePO4,
  Li10GeP2S12,
  Graphite,
};

const ndFixtures = loadPatterns(new URL("./fixtures/nd_fixtures.json", import.meta.url));

function toStructure(name: string): Structure {
  return structures[name];
}

function checkFull(name: string, patternKey: string, options?: NdOptions) {
  const structure = toStructure(name);
  const expected = ndFixtures[name][patternKey];
  const actual = calculateNdPattern(structure, options);

  expectPatternClose(actual, expected);
  expectHklsClose(
    actual.hkls.map((peak) => peak.map((f) => ({ hkl: f.hkl, multiplicity: f.multiplicity }))),
    expected.hkls,
  );
}

describe("calculateNdPattern pymatgen parity", () => {
  it("matches CsCl (0-90)", () => {
    checkFull("CsCl", "pattern_nd_0_90", { twoThetaRange: [0, 90] });

    const pattern = calculateNdPattern(toStructure("CsCl"));

    expect(pattern.twoTheta[0]).toBeCloseTo(21.107738329639844, 9);
    expect(pattern.hkls[0]).toEqual([{ hkl: [1, 0, 0], multiplicity: 6 }]);
    expect(pattern.dSpacings[0]).toBeCloseTo(4.2089999999999996, 9);
    expect(pattern.twoTheta[1]).toBeCloseTo(30.024695921112777, 9);
    expect(pattern.hkls[1]).toEqual([{ hkl: [1, 1, 0], multiplicity: 12 }]);
    expect(pattern.dSpacings[1]).toBeCloseTo(2.976212442014178, 9);
  });

  it("matches LiFePO4 second peak", () => {
    checkFull("LiFePO4", "pattern_nd_0_90");

    const pattern = calculateNdPattern(toStructure("LiFePO4"));

    expect(pattern.twoTheta[1]).toBeCloseTo(17.03504233621785, 9);
    expect(pattern.intensities[1]).toBeCloseTo(46.2985965, 6);
  });

  it("matches Li10GeP2S12 second peak", () => {
    checkFull("Li10GeP2S12", "pattern_nd_0_90");

    const pattern = calculateNdPattern(toStructure("Li10GeP2S12"));

    expect(pattern.twoTheta[1]).toBeCloseTo(14.058274883353876, 9);
    expect(pattern.intensities[1]).toBeCloseTo(3.60588013, 6);
  });

  it("matches hexagonal graphite with and without Debye-Waller", () => {
    checkFull("Graphite", "pattern_nd_0_90");

    const structure = toStructure("Graphite");
    const pattern = calculateNdPattern(structure);

    expect(pattern.twoTheta[0]).toBeCloseTo(26.21057350859598, 9);
    expect(pattern.intensities[0]).toBeCloseTo(100, 9);
    expect(pattern.twoTheta[2]).toBeCloseTo(44.39599754, 6);
    expect(pattern.intensities[2]).toBeCloseTo(42.62382517, 6);
    expect(pattern.hkls[0][0].hkl.length).toBe(4);

    const dw = calculateNdPattern(structure, { debyeWallerFactors: { C: 1 } });

    expect(dw.twoTheta[0]).toBeCloseTo(26.21057350859598, 9);
    expect(dw.intensities[0]).toBeCloseTo(100, 9);
    expect(dw.twoTheta[2]).toBeCloseTo(44.39599754, 6);
    expect(dw.intensities[2]).toBeCloseTo(39.47151705, 6);
    expectPatternClose(dw, ndFixtures.Graphite.pattern_nd_dw);
  });

  it("rejects elements without scattering lengths", () => {
    const structure = replaceSite(CsCl, 0, { ...CsCl.sites[0], species: { symbol: "Cm" } });

    expect(() => calculateNdPattern(structure)).toThrow(/no scattering coefficients for Cm/);
  });
});
