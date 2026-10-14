import { describe, it, expect } from "vitest";
import { splitSite, groupDisorder } from "@/core/site/disorder";
import { occupancyOf } from "@/core/site/occupancy";
import { fromPymatgen } from "@/core/io/pymatgen";
import type { Site } from "@/core/site/site";

function ordered(symbol: string, frac: number[]): Site {
  return { species: { symbol }, frac: new Float64Array(frac) };
}

describe("splitSite", () => {
  it("expands one site per species with occu fractions", () => {
    const sites = splitSite(
      [0.25, 0.25, 0.25],
      [
        { symbol: "Ag", fraction: 0.5 },
        { symbol: "Pd", fraction: 0.5 },
      ],
    );
    expect(sites.length).toBe(2);
    expect(sites.map((s) => s.species.symbol)).toEqual(["Ag", "Pd"]);
    expect(sites.map(occupancyOf)).toEqual([0.5, 0.5]);
    for (const s of sites) {
      expect(Array.from(s.frac)).toEqual([0.25, 0.25, 0.25]);
    }
  });

  it("accepts a record", () => {
    const sites = splitSite([0, 0, 0], { Ag: 0.75, Pd: 0.25 });
    expect(sites.map((s) => s.species.symbol).sort()).toEqual(["Ag", "Pd"]);
  });

  it("rejects out-of-range fractions", () => {
    expect(() =>
      splitSite([0, 0, 0], [{ symbol: "Ag", fraction: 1.5 }]),
    ).toThrow();
    expect(() =>
      splitSite([0, 0, 0], [{ symbol: "Ag", fraction: NaN }]),
    ).toThrow();
  });
});

describe("groupDisorder", () => {
  it("round-trips split sites", () => {
    const sites = splitSite(
      [0.1, 0.2, 0.3],
      [
        { symbol: "Ag", fraction: 0.5 },
        { symbol: "Pd", fraction: 0.5 },
      ],
    );
    const [pos] = groupDisorder(sites);
    expect(Array.from(pos.frac)).toEqual([0.1, 0.2, 0.3]);
    expect(pos.occupancy).toEqual([
      { symbol: "Ag", fraction: 0.5 },
      { symbol: "Pd", fraction: 0.5 },
    ]);
    expect(pos.indices).toEqual([0, 1]);
  });

  it("leaves ordered sites as singletons", () => {
    const sites = [ordered("Si", [0, 0, 0]), ordered("Si", [0.5, 0.5, 0.5])];
    const groups = groupDisorder(sites);
    expect(groups.length).toBe(2);
    expect(groups[0].occupancy).toEqual([{ symbol: "Si", fraction: 1 }]);
  });

  it("allows vacancies but throws on overfill", () => {
    const vac = splitSite([0, 0, 0], [{ symbol: "Ag", fraction: 0.5 }]);
    expect(groupDisorder(vac)[0].occupancy).toEqual([
      { symbol: "Ag", fraction: 0.5 },
    ]);
    const over = [
      ...splitSite([0, 0, 0], [{ symbol: "Ag", fraction: 0.7 }]),
      ...splitSite([0, 0, 0], [{ symbol: "Pd", fraction: 0.5 }]),
    ];
    expect(() => groupDisorder(over)).toThrow(/sum/);
  });

  it("merges near-duplicates with tol", () => {
    const split: Site[] = [
      {
        species: { symbol: "Ag", properties: { occu: 0.5 } },
        frac: new Float64Array([0, 0, 0]),
      },
      {
        species: { symbol: "Pd", properties: { occu: 0.5 } },
        frac: new Float64Array([1e-9, 0, 0]),
      },
    ];
    expect(groupDisorder(split).length).toBe(2);
    expect(groupDisorder(split, 1e-6)[0].occupancy).toEqual([
      { symbol: "Ag", fraction: 0.5 },
      { symbol: "Pd", fraction: 0.5 },
    ]);
  });
});

describe("fromPymatgen disorder", () => {
  it("expands multi-species sites to split sites", () => {
    const s = fromPymatgen({
      "@module": "pymatgen.core.structure",
      "@class": "Structure",
      lattice: {
        matrix: [
          [4, 0, 0],
          [0, 4, 0],
          [0, 0, 4],
        ],
      },
      sites: [
        {
          species: [
            { element: "Ag", occu: 0.5 },
            { element: "Pd", occu: 0.5 },
          ],
          abc: [0, 0, 0],
        },
      ],
    });
    expect(s.sites.length).toBe(2);
    expect(groupDisorder(s.sites)[0].occupancy).toEqual([
      { symbol: "Ag", fraction: 0.5 },
      { symbol: "Pd", fraction: 0.5 },
    ]);
  });

  it("keeps single-species behavior", () => {
    const s = fromPymatgen({
      "@module": "pymatgen.core.structure",
      "@class": "Structure",
      lattice: {
        matrix: [
          [4, 0, 0],
          [0, 4, 0],
          [0, 0, 4],
        ],
      },
      sites: [{ species: [{ element: "Si", occu: 1 }], abc: [0, 0, 0] }],
    });
    expect(s.sites.length).toBe(1);
    expect(occupancyOf(s.sites[0])).toBe(1);
  });
});
