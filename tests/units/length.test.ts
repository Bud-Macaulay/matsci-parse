import { LengthUnitSystem } from "../../lib/units/index";

describe("LengthUnitSystem", () => {
  test("identity conversion", () => {
    expect(LengthUnitSystem.convert(5, "angstrom", "angstrom")).toBe(5);
  });

  test("angstrom to nm", () => {
    expect(LengthUnitSystem.convert(1, "angstrom", "nm")).toBeCloseTo(0.1);
  });

  test("nm to angstrom", () => {
    expect(LengthUnitSystem.convert(0.1, "nm", "angstrom")).toBeCloseTo(1);
  });

  test("bohr conversion sanity", () => {
    const result = LengthUnitSystem.convert(1, "angstrom", "bohr");
    expect(result).toBeGreaterThan(1);
  });

  test("alias Å works", () => {
    const result = LengthUnitSystem.convert(1, "Å", "angstrom");
    expect(result).toBeCloseTo(1);
  });

  test("array conversion", () => {
    const result = LengthUnitSystem.convertArray([1, 2, 3], "angstrom", "nm");

    expect(result).toEqual([0.1, 0.2, 0.3]);
  });
});
