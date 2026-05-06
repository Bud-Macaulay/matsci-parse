import { AngleUnitSystem } from "../../lib/units/index";

describe("AngleUnitSystem", () => {
  test("identity conversion", () => {
    expect(AngleUnitSystem.convert(1, "rad", "rad")).toBe(1);
  });

  test("deg to rad", () => {
    expect(AngleUnitSystem.convert(180, "deg", "rad")).toBeCloseTo(Math.PI);
  });

  test("rad to deg", () => {
    expect(AngleUnitSystem.convert(Math.PI, "rad", "deg")).toBeCloseTo(180);
  });

  test("grad conversion", () => {
    expect(AngleUnitSystem.convert(200, "grad", "rad")).toBeCloseTo(Math.PI);
  });

  test("alias ° works", () => {
    expect(AngleUnitSystem.convert(180, "°", "rad")).toBeCloseTo(Math.PI);
  });

  test("roundtrip stability", () => {
    const val = 123;
    const converted = AngleUnitSystem.convert(val, "deg", "rad");
    const back = AngleUnitSystem.convert(converted, "rad", "deg");

    expect(back).toBeCloseTo(val);
  });

  test("array conversion", () => {
    const result = AngleUnitSystem.convertArray([0, 90, 180], "deg", "rad");

    expect(result[2]).toBeCloseTo(Math.PI);
  });
});
