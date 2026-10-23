import { FrequencyUnitSystem } from "@/core/units/index";

describe("FrequencyUnitSystem", () => {
  test("identity conversion", () => {
    expect(FrequencyUnitSystem.convert(10, "cm-1", "cm-1")).toBe(10);
  });

  test("THz to cm-1", () => {
    const result = FrequencyUnitSystem.convert(1, "THz", "cm-1");
    expect(result).toBeCloseTo(33.35640952, 8);
  });

  test("meV and eV to cm-1", () => {
    expect(FrequencyUnitSystem.convert(1, "meV", "cm-1")).toBeCloseTo(8.065543937, 8);
    expect(FrequencyUnitSystem.convert(1, "eV", "cm-1")).toBeCloseTo(8065.543937, 5);
  });

  test("THz to meV", () => {
    // h · 1 THz = 4.135667696 meV
    const result = FrequencyUnitSystem.convert(1, "THz", "meV");
    expect(result).toBeCloseTo(4.135667696, 8);
  });

  test("Hartree is twice Rydberg", () => {
    const result = FrequencyUnitSystem.convert(1, "Hartree", "Rydberg");
    expect(result).toBeCloseTo(2, 10);
  });

  test("Rydberg to eV", () => {
    const result = FrequencyUnitSystem.convert(1, "Rydberg", "eV");
    expect(result).toBeCloseTo(13.605693122994, 8);
  });

  test("aliases", () => {
    for (const alias of ["cm^-1", "cm⁻¹", "1/cm"]) {
      expect(FrequencyUnitSystem.convert(10, alias, "cm-1")).toBe(10);
    }
    expect(FrequencyUnitSystem.convert(1, "thz", "THz")).toBe(1);
    expect(FrequencyUnitSystem.convert(1, "Ha", "Hartree")).toBe(1);
  });

  test("negative (imaginary) frequencies keep their sign", () => {
    const result = FrequencyUnitSystem.convert(-100, "cm-1", "THz");
    expect(result).toBeCloseTo(-2.99792458, 8);
  });

  test("round-trips", () => {
    const units = ["cm-1", "THz", "meV", "eV", "Hartree", "Rydberg"];
    for (const from of units) {
      for (const to of units) {
        const v = -123.456;
        const back = FrequencyUnitSystem.convert(
          FrequencyUnitSystem.convert(v, from, to),
          to,
          from,
        );
        expect(back).toBeCloseTo(v, 10);
      }
    }
  });

  test("array conversion", () => {
    const result = FrequencyUnitSystem.convertArray([1, -2], "THz", "cm-1");

    expect(result[1]).toBeCloseTo(-2 * result[0]);
  });
});
