import { LengthUnitSystem } from "../../lib/units/units";
import {
  convertMeasurement,
  convertMeasurementArray,
} from "../../lib/units/units";

describe("Direct conversion", () => {
  test("convertMeasurement works", () => {
    expect(
      convertMeasurement(1, "angstrom", "nm", { angstrom: 1, nm: 10 }),
    ).toBeCloseTo(0.1);
  });

  test("convertMeasurementArray works", () => {
    expect(
      convertMeasurementArray([1, 10], "angstrom", "nm", {
        angstrom: 1,
        nm: 10,
      }),
    ).toEqual([0.1, 1]);
  });

  test("convertMeasurement returns same value if units are identical", () => {
    expect(
      convertMeasurement(42, "angstrom", "angstrom", { angstrom: 1 }),
    ).toBe(42);
  });
});

describe("LengthUnitSystem", () => {
  test("converts between canonical units", () => {
    expect(LengthUnitSystem.convert(1, "angstrom", "nm")).toBeCloseTo(0.1);
    expect(LengthUnitSystem.convert(10, "nm", "angstrom")).toBeCloseTo(100);
    expect(LengthUnitSystem.convert(0.01, "pm", "angstrom")).toBeCloseTo(
      0.0001,
    );
  });

  test("identity conversion returns same value", () => {
    expect(LengthUnitSystem.convert(42, "angstrom", "angstrom")).toBe(42);
    expect(LengthUnitSystem.convertArray([1, 2, 3], "nm", "nm")).toEqual([
      1, 2, 3,
    ]);
  });

  test("aliases are resolved correctly", () => {
    expect(LengthUnitSystem.convert(1, "Å", "angstrom")).toBe(1);
    expect(LengthUnitSystem.convert(1, "angstrom", "Å")).toBe(1);
    expect(LengthUnitSystem.convert(2, "μm", "um")).toBe(2);
    expect(LengthUnitSystem.convertArray([1, 2], "Å", "angstrom")).toEqual([
      1, 2,
    ]);
  });

  test("convertArray works for multiple numbers", () => {
    const input = [1, 10, 100];
    const output = LengthUnitSystem.convertArray(input, "angstrom", "nm");
    expect(output.map((v) => parseFloat(v.toFixed(2)))).toEqual([0.1, 1, 10]);
  });

  test("round-trip conversion returns original value", () => {
    const units: (keyof typeof LengthUnitSystem.conversions)[] = [
      "angstrom",
      "bohr",
      "nm",
      "pm",
      "um",
      "cm",
      "m",
      "fm",
    ];
    for (const u1 of units) {
      for (const u2 of units) {
        const val = Math.random() * 1000;
        const roundTrip = LengthUnitSystem.convert(
          LengthUnitSystem.convert(val, u1, u2),
          u2,
          u1,
        );
        expect(roundTrip).toBeCloseTo(val, 8);
      }
    }
  });

  test("handles fractional and negative numbers", () => {
    expect(LengthUnitSystem.convert(-1.5, "angstrom", "nm")).toBeCloseTo(-0.15);
    expect(LengthUnitSystem.convert(0.25, "nm", "angstrom")).toBeCloseTo(2.5);
    expect(LengthUnitSystem.convertArray([-1, 0, 1], "angstrom", "nm")).toEqual(
      [-0.1, 0, 0.1],
    );
  });
});
