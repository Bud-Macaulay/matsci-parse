import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createLattice } from "@/core/lattice/lattice";
import { Structure } from "@/core/structure/structure";
import { calculateXrdPattern, XrdOptions } from "@/core/structure/analysis/diffraction/xrd/xrd";

interface FixtureSite {
  symbol: string;
  occu: number;
  frac: [number, number, number];
}

interface FixtureStructure {
  lattice: number[][];
  sites: FixtureSite[];
}

interface FixtureHkl {
  hkl: number[];
  multiplicity: number;
}

interface FixturePattern {
  two_theta: number[];
  intensities: number[];
  hkls: FixtureHkl[][];
  d_spacings: number[];
}

interface Fixtures {
  CsCl: { structure: FixtureStructure; pattern_cu_0_90: FixturePattern; pattern_mo_0_90: FixturePattern };
  LiFePO4: { structure: FixtureStructure; pattern_cu_0_90: FixturePattern; pattern_tol5: FixturePattern };
  Li10GeP2S12: { structure: FixtureStructure; pattern_cu_0_90: FixturePattern; pattern_tol5: FixturePattern };
  Graphite: { structure: FixtureStructure; pattern_cu_0_90: FixturePattern };
  TetragonalSiRuPr: {
    structure: FixtureStructure;
    pattern_cu_0_90: FixturePattern;
    pattern_cu_0_60: FixturePattern;
  };
  TungstenBCC: {
    structure: FixtureStructure;
    pattern_unscaled: FixturePattern;
    pattern_unscaled_dw: FixturePattern;
  };
}

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/xrd_fixtures.json", import.meta.url), "utf-8"),
) as Fixtures;

function toStructure(f: FixtureStructure): Structure {
  return {
    lattice: createLattice(f.lattice.flat()),
    sites: f.sites.map((s) => ({
      species: { symbol: s.symbol, properties: { occu: s.occu } },
      frac: [...s.frac],
    })),
  };
}

/** Relative tolerance: pymatgen parity up to libm last-ulp differences. */
function expectPatternClose(
  actual: { twoTheta: number[]; intensities: number[]; dSpacings: number[] },
  expected: FixturePattern,
) {
  expect(actual.twoTheta.length).toBe(expected.two_theta.length);
  expect(actual.intensities.length).toBe(expected.intensities.length);

  for (let i = 0; i < expected.two_theta.length; i++) {
    for (const [a, b] of [
      [actual.twoTheta[i], expected.two_theta[i]],
      [actual.intensities[i], expected.intensities[i]],
      [actual.dSpacings[i], expected.d_spacings[i]],
    ] as const) {
      expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(1e-9);
    }
  }
}

function expectHklsClose(actual: FixtureHkl[][], expected: FixtureHkl[][]) {
  expect(actual.length).toBe(expected.length);

  // Families within a peak are compared order-insensitively: families with
  // analytically identical d-spacings (e.g. (5,0,6) vs (4,3,6) when
  // 5^2 == 4^2 + 3^2) are ordered by last-ulp floating point noise, which
  // varies with the reciprocal-lattice inverse implementation and BLAS build.
  const key = (f: FixtureHkl) => `${f.multiplicity}:${f.hkl.join(",")}`;

  for (let i = 0; i < expected.length; i++) {
    expect(actual[i].map(key).sort()).toEqual(expected[i].map(key).sort());
  }
}

function checkFull(name: keyof Fixtures, patternKey: string, options?: XrdOptions) {
  const entry = fixtures[name] as unknown as Record<string, FixturePattern | FixtureStructure>;
  const structure = toStructure(entry.structure as FixtureStructure);
  const expected = entry[patternKey] as FixturePattern;
  const actual = calculateXrdPattern(structure, options);

  expectPatternClose(actual, expected);
  expectHklsClose(
    actual.hkls.map((peak) => peak.map((f) => ({ hkl: f.hkl, multiplicity: f.multiplicity }))),
    expected.hkls,
  );
}

describe("calculateXrdPattern pymatgen parity", () => {
  it("matches CsCl (CuKa, 0-90)", () => {
    checkFull("CsCl", "pattern_cu_0_90", { twoThetaRange: [0, 90] });

    const pattern = calculateXrdPattern(toStructure(fixtures.CsCl.structure));

    expect(pattern.twoTheta[0]).toBeCloseTo(21.107738329639844, 9);
    expect(pattern.intensities[0]).toBeCloseTo(36.483184003748946, 6);
    expect(pattern.hkls[0]).toEqual([{ hkl: [1, 0, 0], multiplicity: 6 }]);
    expect(pattern.dSpacings[0]).toBeCloseTo(4.2089999999999996, 9);
    expect(pattern.twoTheta[1]).toBeCloseTo(30.024695921112777, 9);
    expect(pattern.intensities[1]).toBeCloseTo(100, 9);
    expect(pattern.hkls[1]).toEqual([{ hkl: [1, 1, 0], multiplicity: 12 }]);
    expect(pattern.dSpacings[1]).toBeCloseTo(2.976212442014178, 9);
  });

  it("matches LiFePO4 second peak", () => {
    checkFull("LiFePO4", "pattern_cu_0_90");

    const pattern = calculateXrdPattern(toStructure(fixtures.LiFePO4.structure));

    expect(pattern.twoTheta[1]).toBeCloseTo(17.03504233621785, 9);
    expect(pattern.intensities[1]).toBeCloseTo(50.400928948337075, 6);
  });

  it("matches Li10GeP2S12 second peak", () => {
    checkFull("Li10GeP2S12", "pattern_cu_0_90");

    const pattern = calculateXrdPattern(toStructure(fixtures.Li10GeP2S12.structure));

    expect(pattern.twoTheta[1]).toBeCloseTo(14.058274883353876, 9);
    expect(pattern.intensities[1]).toBeCloseTo(4.4111123641667671, 9);
  });

  it("reports hexagonal graphite peaks with 4-index notation", () => {
    checkFull("Graphite", "pattern_cu_0_90");

    const pattern = calculateXrdPattern(toStructure(fixtures.Graphite.structure));

    expect(pattern.twoTheta[0]).toBeCloseTo(26.21057350859598, 9);
    expect(pattern.intensities[0]).toBeCloseTo(100, 9);
    expect(pattern.hkls[0][0].hkl.length).toBe(4);
  });

  it("matches tetragonal Si/Ru/Pr over two ranges", () => {
    checkFull("TetragonalSiRuPr", "pattern_cu_0_90");

    const structure = toStructure(fixtures.TetragonalSiRuPr.structure);
    const pattern = calculateXrdPattern(structure);

    expect(pattern.twoTheta[0]).toBeCloseTo(12.86727341476735, 9);
    expect(pattern.intensities[0]).toBeCloseTo(31.448239816769796, 6);
    expect(pattern.dSpacings[0]).toBeCloseTo(6.88, 9);
    expect(pattern.twoTheta.length).toBe(42);

    const narrow = calculateXrdPattern(structure, { twoThetaRange: [0, 60] });

    expect(narrow.twoTheta.length).toBe(18);
    expectPatternClose(narrow, fixtures.TetragonalSiRuPr.pattern_cu_0_60);
  });

  it("matches unscaled bcc W with and without Debye-Waller", () => {
    checkFull("TungstenBCC", "pattern_unscaled", { scaled: false });

    const structure = toStructure(fixtures.TungstenBCC.structure);
    const plain = calculateXrdPattern(structure, { scaled: false });

    expect(plain.twoTheta[0]).toBeCloseTo(40.294828554672264, 9);
    expect(plain.intensities[0] / 2414237.5633093244 - 1).toBeLessThan(1e-9);
    expect(plain.dSpacings[0]).toBeCloseTo(2.2382050944897789, 9);

    const dw = calculateXrdPattern(structure, {
      scaled: false,
      debyeWallerFactors: { W: 0.1526 },
    });

    expect(dw.twoTheta[0]).toBeCloseTo(40.294828554672264, 9);
    expect(dw.intensities[0] / 2377745.2296686019 - 1).toBeLessThan(1e-9);
    expectPatternClose(dw, fixtures.TungstenBCC.pattern_unscaled_dw);
  });

  it("matches MoKa on CsCl", () => {
    checkFull("CsCl", "pattern_mo_0_90", { wavelength: "MoKa" });
  });

  it("matches numeric wavelength input", () => {
    const structure = toStructure(fixtures.CsCl.structure);
    const byName = calculateXrdPattern(structure, { wavelength: "CuKa" });
    const byValue = calculateXrdPattern(structure, { wavelength: 1.54184 });

    expect(byValue.twoTheta).toEqual(byName.twoTheta);
    expect(byValue.intensities).toEqual(byName.intensities);
  });

  it("reproduces the peak-merge regression", () => {
    // NOTE: pymatgen's test sets `xrd_calc.TWO_THETA_TOL = 5`, but get_pattern
    // reads AbstractDiffractionPatternCalculator.TWO_THETA_TOL, so the instance
    // attribute is a no-op and the reference values below use the default
    // tolerance 1e-5. The fixtures confirm pattern_tol5 == pattern_cu_0_90.
    const liFePO4 = calculateXrdPattern(toStructure(fixtures.LiFePO4.structure));

    expect(liFePO4.hkls.length).toBe(434);
    expect(liFePO4.hkls.slice(0, 10).map((peak) => peak.map((f) => f.hkl))).toEqual([
      [[0, 1, 0]],
      [[0, 0, 2]],
      [[1, 0, -1]],
      [[1, 0, 1]],
      [[0, 1, -2]],
      [[0, 1, 2]],
      [[1, -1, 0]],
      [[1, 1, 0]],
      [[1, -1, 1]],
      [[1, 1, -1]],
    ]);
    expectPatternClose(liFePO4, fixtures.LiFePO4.pattern_tol5);

    const lgps = calculateXrdPattern(toStructure(fixtures.Li10GeP2S12.structure));

    expect(lgps.hkls.length).toBe(213);
    expectPatternClose(lgps, fixtures.Li10GeP2S12.pattern_tol5);
  });
});

describe("calculateXrdPattern input validation", () => {
  it("rejects unknown wavelength keys", () => {
    const structure = toStructure(fixtures.CsCl.structure);

    expect(() => calculateXrdPattern(structure, { wavelength: "CuKc" })).toThrow(/Unknown XRD wavelength/);
  });

  it("rejects elements without scattering coefficients", () => {
    const structure = toStructure(fixtures.CsCl.structure);

    structure.sites[0].species.symbol = "Xx";

    expect(() => calculateXrdPattern(structure)).toThrow(/no scattering coefficients for Xx/);
  });
});
