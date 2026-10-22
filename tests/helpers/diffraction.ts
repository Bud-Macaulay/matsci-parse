import { readFileSync } from "node:fs";
import { expect } from "vitest";

export interface FixtureHkl {
  hkl: number[];
  multiplicity: number;
}

export interface FixturePattern {
  two_theta: number[];
  intensities: number[];
  hkls: FixtureHkl[][];
  d_spacings: number[];
}

/** One peak as stored on disk: [two_theta, intensity, d, [[hkl, multiplicity], ...]]. */
type PeakRow = [number, number, number, [number[], number][]];

/** Load a diffraction fixture file (see its `_about` entry for the row layout). */
export function loadPatterns(url: URL): Record<string, Record<string, FixturePattern>> {
  const { _about, ...data } = JSON.parse(readFileSync(url, "utf-8")) as Record<
    string,
    Record<string, PeakRow[]>
  >;
  void _about;

  const out: Record<string, Record<string, FixturePattern>> = {};
  for (const [name, patterns] of Object.entries(data)) {
    out[name] = {};
    for (const [key, rows] of Object.entries(patterns)) {
      out[name][key] = {
        two_theta: rows.map((r) => r[0]),
        intensities: rows.map((r) => r[1]),
        d_spacings: rows.map((r) => r[2]),
        hkls: rows.map((r) => r[3].map(([hkl, multiplicity]) => ({ hkl, multiplicity }))),
      };
    }
  }
  return out;
}

/** Relative tolerance: pymatgen parity up to libm last-ulp differences. */
export function expectPatternClose(
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

export function expectHklsClose(actual: FixtureHkl[][], expected: FixtureHkl[][]) {
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
