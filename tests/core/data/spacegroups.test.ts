import { describe, it, expect } from "vitest";

import {
  crystalSystem,
  hallNumbersOfSpacegroup,
  pointgroupMapping,
  pointgroupNumber,
} from "@/core/data/symmetry";

describe("pointgroupNumber", () => {
  it.each([
    [1, "1"],
    [2, "-1"],
    [14, "2/m"],
    [62, "mmm"],
    [139, "4/mmm"],
    [148, "-3"],
    [166, "-3m"],
    [187, "-6m2"],
    [194, "6/mmm"],
    [225, "m-3m"],
    [230, "m-3m"],
  ])("space group %i is in point group %s", (sg, hm) => {
    expect(pointgroupMapping[pointgroupNumber(sg)].hmSymbol).toBe(hm);
  });

  it("covers all 32 point groups, in order", () => {
    const numbers = Array.from({ length: 230 }, (_, i) => pointgroupNumber(i + 1));
    expect(new Set(numbers).size).toBe(32);
    expect(numbers.every((n, i) => i === 0 || n >= numbers[i - 1])).toBe(true);
  });
});

describe("crystalSystem", () => {
  it.each([
    [1, "triclinic"],
    [2, "triclinic"],
    [3, "monoclinic"],
    [15, "monoclinic"],
    [16, "orthorhombic"],
    [74, "orthorhombic"],
    [75, "tetragonal"],
    [142, "tetragonal"],
    [143, "trigonal"],
    [167, "trigonal"],
    [168, "hexagonal"],
    [194, "hexagonal"],
    [195, "cubic"],
    [230, "cubic"],
  ])("space group %i is %s", (sg, system) => {
    expect(crystalSystem(sg)).toBe(system);
  });

  it("agrees with the point group (triclinic: 1-2, monoclinic: 3-5, ...)", () => {
    const firstPointgroup = { triclinic: 1, monoclinic: 3, orthorhombic: 6, tetragonal: 9, trigonal: 16, hexagonal: 21, cubic: 28 };
    const lastPointgroup = { triclinic: 2, monoclinic: 5, orthorhombic: 8, tetragonal: 15, trigonal: 20, hexagonal: 27, cubic: 32 };
    for (let sg = 1; sg <= 230; sg++) {
      const pg = pointgroupNumber(sg);
      const system = crystalSystem(sg);
      expect(pg).toBeGreaterThanOrEqual(firstPointgroup[system]);
      expect(pg).toBeLessThanOrEqual(lastPointgroup[system]);
    }
  });
});

describe("invalid space group numbers", () => {
  it.each([0, 231, -1, 1.5, NaN])("%s throws", (sg) => {
    expect(() => pointgroupNumber(sg)).toThrow("Invalid space group number");
    expect(() => crystalSystem(sg)).toThrow("Invalid space group number");
  });

  it("every space group with Hall numbers is valid", () => {
    for (const sg of Object.keys(hallNumbersOfSpacegroup).map(Number)) {
      expect(() => pointgroupNumber(sg)).not.toThrow();
    }
  });
});
