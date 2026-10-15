import { describe, it, expect } from "vitest";
import {
  createDisorderedSite,
  totalOccupancy,
  isOrderedSite,
} from "@/core/site/disorder";

describe("createDisorderedSite", () => {
  it("builds a site from a species list", () => {
    const site = createDisorderedSite(
      [0.25, 0.25, 0.25],
      [
        { symbol: "Ag", fraction: 0.5 },
        { symbol: "Pd", fraction: 0.5 },
      ],
      { label: "M1" },
    );
    expect(Array.from(site.frac)).toEqual([0.25, 0.25, 0.25]);
    expect(site.occupancy).toEqual([
      { symbol: "Ag", fraction: 0.5 },
      { symbol: "Pd", fraction: 0.5 },
    ]);
    expect(site.properties).toEqual({ label: "M1" });
  });

  it("accepts a record", () => {
    const site = createDisorderedSite([0, 0, 0], { Ag: 0.75, Pd: 0.25 });
    expect(site.occupancy).toEqual([
      { symbol: "Ag", fraction: 0.75 },
      { symbol: "Pd", fraction: 0.25 },
    ]);
  });

  it("copies its inputs", () => {
    const frac = [0.1, 0.2, 0.3];
    const occ = [{ symbol: "Ag", fraction: 1 }];
    const site = createDisorderedSite(frac, occ);
    frac[0] = 9;
    occ[0].fraction = 0.1;
    expect(site.frac[0]).toBe(0.1);
    expect(site.occupancy[0].fraction).toBe(1);
  });

  it("allows vacancies and float noise above 1", () => {
    expect(totalOccupancy(createDisorderedSite([0, 0, 0], { Li: 0.691 }))).toBe(
      0.691,
    );
    expect(() =>
      createDisorderedSite([0, 0, 0], { Ag: 0.5000001, Pd: 0.5 }),
    ).not.toThrow();
  });

  it("rejects invalid occupancies", () => {
    expect(() => createDisorderedSite([0, 0, 0], [])).toThrow(/no species/);
    expect(() => createDisorderedSite([0, 0, 0], { Ag: 1.5 })).toThrow(
      /invalid fraction/,
    );
    expect(() => createDisorderedSite([0, 0, 0], { Ag: -0.1 })).toThrow(
      /invalid fraction/,
    );
    expect(() => createDisorderedSite([0, 0, 0], { Ag: NaN })).toThrow(
      /invalid fraction/,
    );
    expect(() => createDisorderedSite([0, 0, 0], { Ag: 0.7, Pd: 0.5 })).toThrow(
      /sum/,
    );
    expect(() =>
      createDisorderedSite(
        [0, 0, 0],
        [
          { symbol: "Ag", fraction: 0.5 },
          { symbol: "Ag", fraction: 0.5 },
        ],
      ),
    ).toThrow(/duplicate/);
  });
});

describe("isOrderedSite", () => {
  it("is true only for one species at full occupancy", () => {
    expect(isOrderedSite(createDisorderedSite([0, 0, 0], { Si: 1 }))).toBe(
      true,
    );
    expect(isOrderedSite(createDisorderedSite([0, 0, 0], { Li: 0.5 }))).toBe(
      false,
    );
    expect(
      isOrderedSite(createDisorderedSite([0, 0, 0], { Ag: 0.5, Pd: 0.5 })),
    ).toBe(false);
  });
});
