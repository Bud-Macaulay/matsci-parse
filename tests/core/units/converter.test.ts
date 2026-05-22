import {
  convertMeasurement,
  convertMeasurementArray,
} from "@/core/units/index";

describe("convertMeasurement (generic engine)", () => {
  const conversions = {
    a: 1,
    b: 2,
    c: 4,
  };

  test("identity conversion", () => {
    expect(convertMeasurement(10, "a", "a", conversions)).toBe(10);
  });

  test("basic scaling", () => {
    // 10 a -> 20 b (since b = 2x a)
    expect(convertMeasurement(10, "a", "b", conversions)).toBeCloseTo(5);
  });

  test("reverse scaling", () => {
    expect(convertMeasurement(5, "b", "a", conversions)).toBeCloseTo(10);
  });

  test("array conversion", () => {
    const result = convertMeasurementArray([1, 2, 3], "a", "b", conversions);

    expect(result).toEqual([0.5, 1, 1.5]);
  });

  test("aliases resolve correctly", () => {
    const aliases = { A: "a" as const };

    const result = convertMeasurement(10, "A", "b", conversions, aliases);

    expect(result).toBeCloseTo(5);
  });
});
