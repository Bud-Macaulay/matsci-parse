import { describe, expect, it } from "vitest";
import { EV_PER_A3_TO_GPA, PressureUnitSystem } from "@/core/units/index";

describe("PressureUnitSystem", () => {
  it("1 eV/Å³ = 160.21766208 GPa (ASE: 1 / ase.units.GPa)", () => {
    expect(EV_PER_A3_TO_GPA).toBe(160.21766208);
    expect(PressureUnitSystem.convert(1, "eV/Å³", "GPa")).toBe(160.21766208);
    expect(PressureUnitSystem.convert(160.21766208, "GPa", "eV/Å³")).toBeCloseTo(1, 15);
  });

  it("kbar, bar, MPa, Pa, Mbar, atm", () => {
    expect(PressureUnitSystem.convert(10, "kbar", "GPa")).toBeCloseTo(1, 15);
    expect(PressureUnitSystem.convert(1, "GPa", "bar")).toBeCloseTo(1e4, 9);
    expect(PressureUnitSystem.convert(1, "GPa", "MPa")).toBeCloseTo(1e3, 10);
    expect(PressureUnitSystem.convert(1, "GPa", "Pa")).toBeCloseTo(1e9, 4);
    expect(PressureUnitSystem.convert(1, "Mbar", "GPa")).toBe(100);
    expect(PressureUnitSystem.convert(1, "atm", "Pa")).toBeCloseTo(101325, 6);
    // VASP's kB: 1 eV/Å³ = 1602.1766208 kbar.
    expect(PressureUnitSystem.convert(1, "eV/Å³", "kbar")).toBeCloseTo(1602.1766208, 9);
  });

  it("aliases and arrays", () => {
    expect(PressureUnitSystem.convert(1, "eV/A^3", "kB")).toBeCloseTo(1602.1766208, 9);
    expect(PressureUnitSystem.convertArray([1, 2], "GPa", "kbar")).toEqual([10, 20]);
  });
});
