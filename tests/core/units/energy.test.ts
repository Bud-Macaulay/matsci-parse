import { EnergyUnitSystem } from "@/core/units/index";

describe("EnergyUnitSystem", () => {
  test("identity conversion", () => {
    expect(EnergyUnitSystem.convert(10, "eV", "eV")).toBe(10);
  });

  test("eV to Hartree", () => {
    const result = EnergyUnitSystem.convert(27.2114, "eV", "Hartree");
    expect(result).toBeCloseTo(1, 3);
  });

  test("Hartree to eV", () => {
    const result = EnergyUnitSystem.convert(1, "Hartree", "eV");
    expect(result).toBeCloseTo(27.2114, 3);
  });

  test("kJ/mol conversion sanity", () => {
    const result = EnergyUnitSystem.convert(1, "eV", "kJ/mol");
    expect(result).toBeGreaterThan(0);
  });

  test("alias ev works", () => {
    const result = EnergyUnitSystem.convert(10, "ev", "eV");
    expect(result).toBe(10);
  });

  test("array conversion", () => {
    const result = EnergyUnitSystem.convertArray([1, 2], "eV", "Hartree");

    expect(result[1]).toBeCloseTo(result[0] * 2);
  });
});
