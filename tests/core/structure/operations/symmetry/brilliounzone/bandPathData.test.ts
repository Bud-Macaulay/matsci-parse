import { describe, it, expect } from "vitest";

import { bandPathData } from "@/core/structure/operations/symmetry/brilliounzone/bandPathData";

const SIMPLE_FRACTIONS = new Set([
  "0",
  "1/2",
  "-1/2",
  "1",
  "1/4",
  "3/8",
  "3/4",
  "5/8",
  "1/3",
]);

describe("bandPathData integrity", () => {
  it("covers all 29 extended Bravais lattices", () => {
    const expected = [
      "aP2",
      "aP3",
      "cF1",
      "cF2",
      "cI1",
      "cP1",
      "cP2",
      "hP1",
      "hP2",
      "hR1",
      "hR2",
      "mC1",
      "mC2",
      "mC3",
      "mP1",
      "oA1",
      "oA2",
      "oC1",
      "oC2",
      "oF1",
      "oF2",
      "oF3",
      "oI1",
      "oI2",
      "oI3",
      "oP1",
      "tI1",
      "tI2",
      "tP1",
    ];
    expect(Object.keys(bandPathData).sort()).toEqual(expected);
  });

  it.each(Object.keys(bandPathData))(
    "path segments reference only defined points for %s",
    (key) => {
      const data = bandPathData[key];
      const pointNames = new Set(Object.keys(data.points));
      for (const [start, stop] of data.path) {
        expect(pointNames, `missing start point ${start}`).toContain(start);
        expect(pointNames, `missing stop point ${stop}`).toContain(stop);
      }
    },
  );

  it.each(Object.keys(bandPathData))(
    "points only reference defined k-parameters for %s",
    (key) => {
      const data = bandPathData[key];
      const kparamNames = new Set(data.kparam.map(([name]) => name));
      // evalExprSimple resolves simple fractions and the extended set derived
      // from each k-parameter name: k, -k, 1-k, -1+k, 1/2-k, 1/2+k
      const extendedNames = new Set<string>();
      for (const name of kparamNames) {
        extendedNames.add(name);
        extendedNames.add(`-${name}`);
        extendedNames.add(`1-${name}`);
        extendedNames.add(`-1+${name}`);
        extendedNames.add(`1/2-${name}`);
        extendedNames.add(`1/2+${name}`);
      }
      for (const [pointName, coords] of Object.entries(data.points)) {
        for (const expr of coords) {
          if (SIMPLE_FRACTIONS.has(expr)) continue;
          expect(
            extendedNames,
            `${key} point ${pointName} uses undeclared symbol ${expr}`,
          ).toContain(expr);
        }
      }
    },
  );

  it.each(Object.keys(bandPathData))(
    "k-parameter names are unique for %s",
    (key) => {
      const names = bandPathData[key].kparam.map(([name]) => name);
      expect(new Set(names).size).toBe(names.length);
    },
  );

  it("every path starts and ends somewhere sensible (no self-loops)", () => {
    for (const data of Object.values(bandPathData)) {
      for (const [start, stop] of data.path) {
        expect(start).not.toBe(stop);
      }
    }
  });
});
