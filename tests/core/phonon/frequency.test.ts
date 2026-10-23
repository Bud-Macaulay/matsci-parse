import { describe, expect, it } from "vitest";

import { convertFrequencies, createPhononBands, frequencyRange, type PhononBands } from "@/core/phonon";
import { poSC } from "../../fixtures/structures";

/** Bands for one-site α-Po (3 modes) with the given [nqpts × 3] frequencies in cm⁻¹. */
function withFrequencies(frequencies: number[]): PhononBands {
  const nqpts = frequencies.length / 3;
  return createPhononBands({
    structure: poSC,
    qpoints: new Float64Array(nqpts * 3),
    frequencies,
    eigenvectors: new Float64Array(nqpts * 3 * 3 * 2),
  });
}

describe("frequencyRange", () => {
  const bands = withFrequencies([-12.5, 0, 3, 40, 100, 250]);

  it("spans all q-points and modes, imaginary modes included", () => {
    expect(frequencyRange(bands)).toEqual({ min: -12.5, max: 250 });
  });

  it("converts to the requested unit", () => {
    const { min, max } = frequencyRange(bands, { unit: "THz" });
    expect(min).toBeCloseTo(-12.5 / 33.3564095198152, 12);
    expect(max).toBeCloseTo(250 / 33.3564095198152, 12);
  });

  it("throws on empty bands", () => {
    expect(() => frequencyRange(withFrequencies([]))).toThrow(/no frequencies/);
  });
});

describe("convertFrequencies", () => {
  it("returns a converted copy and leaves the bands untouched", () => {
    const bands = withFrequencies([-8.065543937349211, 0, 8065.543937349211]);
    const out = convertFrequencies(bands, "meV");
    expect(out).not.toBe(bands.frequencies);
    expect(out[0]).toBeCloseTo(-1, 12);
    expect(out[1]).toBe(0);
    expect(out[2]).toBeCloseTo(1000, 9);
    expect(bands.frequencies[2]).toBe(8065.543937349211);
  });

  it("rejects unknown units", () => {
    expect(() => convertFrequencies(withFrequencies([1, 2, 3]), "furlongs")).toThrow(/Unknown frequency unit/);
  });
});
