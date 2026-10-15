import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { createDisorderedSite } from "@/core/site/disorder";
import {
  assertOrdered,
  isDisordered,
  scatterers,
  toDisordered,
  toOrdered,
  type DisorderedStructure,
} from "@/core/structure/disordered";
import type { Structure } from "@/core/structure/structure";
import { fromPymatgen, toPymatgen } from "@/core/io/pymatgen";
import { toPOSCAR } from "@/core/io/poscar";
import { analyzeStructure } from "@/core/structure/operations/symmetry/spglib";
import { ewaldSum } from "@/core/structure/analysis/ewald/ewald";
import { slabFromMillerIndex } from "@/core/structure/operations/slab/slabFromMillerIndex";
import { calculateXrdPattern } from "@/core/structure/analysis/diffraction/xrd/xrd";
import { calculateNdPattern } from "@/core/structure/analysis/diffraction/neutron/neutron";

const cubic = (a: number) => createLattice([a, 0, 0, 0, a, 0, 0, 0, a]);

const ordered: Structure = {
  lattice: cubic(4),
  sites: [
    {
      species: { symbol: "Na", properties: { label: "Na1" } },
      frac: new Float64Array([0, 0, 0]),
      properties: { magmom: 0 },
    },
    {
      species: { symbol: "Cl" },
      frac: new Float64Array([0.5, 0.5, 0.5]),
    },
  ],
};

const alloy: DisorderedStructure = {
  disordered: true,
  lattice: cubic(4),
  sites: [
    createDisorderedSite([0, 0, 0], { Na: 1 }),
    createDisorderedSite([0.5, 0.5, 0.5], { Cl: 0.5, Br: 0.5 }),
  ],
};

describe("isDisordered / assertOrdered", () => {
  it("narrows on the disordered tag", () => {
    expect(isDisordered(alloy)).toBe(true);
    expect(isDisordered(ordered)).toBe(false);
  });

  it("assertOrdered throws only for disordered structures", () => {
    expect(() => assertOrdered(ordered, "ctx")).not.toThrow();
    expect(() => assertOrdered(alloy, "ctx")).toThrow(/ctx: .*disordered/);
    expect(() => assertOrdered(null, "ctx")).not.toThrow();
  });
});

describe("toDisordered / toOrdered", () => {
  it("round-trips an ordered structure, keeping properties", () => {
    const d = toDisordered(ordered);
    expect(d.disordered).toBe(true);
    expect(d.sites[0].occupancy).toEqual([
      { symbol: "Na", fraction: 1, properties: { label: "Na1" } },
    ]);
    expect(d.sites[0].properties).toEqual({ magmom: 0 });
    expect(d.sites[1].occupancy).toEqual([{ symbol: "Cl", fraction: 1 }]);

    const back = toOrdered(d);
    expect(isDisordered(back)).toBe(false);
    expect(back).toEqual(ordered);
  });

  it("carries partial occu into the fraction", () => {
    const partial: Structure = {
      lattice: cubic(4),
      sites: [
        {
          species: { symbol: "Li", properties: { occu: 0.691 } },
          frac: new Float64Array([0, 0, 0]),
        },
      ],
    };
    expect(toDisordered(partial).sites[0].occupancy).toEqual([
      { symbol: "Li", fraction: 0.691, properties: {} },
    ]);
  });

  it("toOrdered rejects shared and vacant sites", () => {
    expect(() => toOrdered(alloy)).toThrow(/site 1 is disordered/);
    const vacant: DisorderedStructure = {
      disordered: true,
      lattice: cubic(4),
      sites: [createDisorderedSite([0, 0, 0], { Li: 0.5 })],
    };
    expect(() => toOrdered(vacant)).toThrow(/site 0 is disordered/);
  });
});

describe("scatterers", () => {
  it("emits one entry per species of each site", () => {
    expect(
      scatterers(alloy).map(({ symbol, occupancy }) => [symbol, occupancy]),
    ).toEqual([
      ["Na", 1],
      ["Cl", 0.5],
      ["Br", 0.5],
    ]);
  });

  it("uses occu for ordered sites", () => {
    expect(scatterers(ordered).map((s) => s.occupancy)).toEqual([1, 1]);
  });
});

describe("diffraction on disordered structures", () => {
  // The same average crystal written as ordered co-located partial sites,
  // which the diffraction code has always summed correctly.
  const splitEquivalent: Structure = {
    lattice: cubic(4),
    sites: [
      { species: { symbol: "Na" }, frac: new Float64Array([0, 0, 0]) },
      {
        species: { symbol: "Cl", properties: { occu: 0.5 } },
        frac: new Float64Array([0.5, 0.5, 0.5]),
      },
      {
        species: { symbol: "Br", properties: { occu: 0.5 } },
        frac: new Float64Array([0.5, 0.5, 0.5]),
      },
    ],
  };

  it("XRD matches the equivalent partial-occupancy structure", () => {
    const a = calculateXrdPattern(alloy);
    const b = calculateXrdPattern(splitEquivalent);
    expect(a.twoTheta.length).toBeGreaterThan(0);
    expect(a.twoTheta).toEqual(b.twoTheta);
    a.intensities.forEach((y, i) =>
      expect(y).toBeCloseTo(b.intensities[i], 10),
    );
  });

  it("ND matches the equivalent partial-occupancy structure", () => {
    const a = calculateNdPattern(alloy);
    const b = calculateNdPattern(splitEquivalent);
    expect(a.twoTheta.length).toBeGreaterThan(0);
    expect(a.twoTheta).toEqual(b.twoTheta);
    a.intensities.forEach((y, i) =>
      expect(y).toBeCloseTo(b.intensities[i], 10),
    );
  });
});

describe("ordered-only entry points reject disordered input", () => {
  it("analyzeStructure", async () => {
    // @ts-expect-error DisorderedStructure is not a Structure
    await expect(analyzeStructure(alloy)).rejects.toThrow(
      /analyzeStructure: .*disordered/,
    );
  });

  it("ewaldSum", () => {
    // @ts-expect-error DisorderedStructure is not a Structure
    expect(() => ewaldSum(alloy, [1, -1])).toThrow(/ewaldSum: .*disordered/);
  });

  it("slabFromMillerIndex", () => {
    // @ts-expect-error DisorderedStructure is not a Structure
    expect(() => slabFromMillerIndex(alloy, 1, 0, 0)).toThrow(
      /slabFromMillerIndex: .*disordered/,
    );
  });

  it("toPOSCAR", () => {
    // @ts-expect-error DisorderedStructure is not a Structure
    expect(() => toPOSCAR(alloy)).toThrow(/toPOSCAR: .*disordered/);
  });

  it("an ordered Structure is not a DisorderedStructure either", () => {
    // @ts-expect-error Structure lacks the disordered tag and occupancies
    const d: DisorderedStructure = ordered;
    expect(isDisordered(d)).toBe(false);
  });
});

describe("pymatgen disorder", () => {
  const lattice = {
    matrix: [
      [4, 0, 0],
      [0, 4, 0],
      [0, 0, 4],
    ],
  };
  const header = {
    "@module": "pymatgen.core.structure",
    "@class": "Structure",
  };

  it("reads a fully ordered file as a Structure (unchanged shape)", () => {
    const s = fromPymatgen({
      ...header,
      lattice,
      sites: [{ species: [{ element: "Si", occu: 1 }], abc: [0, 0, 0] }],
    });
    expect(isDisordered(s)).toBe(false);
    if (isDisordered(s)) return;
    expect(s.sites[0].species).toEqual({
      symbol: "Si",
      properties: { occu: 1, label: "Si" },
    });
  });

  it("reads shared and vacant sites as a DisorderedStructure", () => {
    const s = fromPymatgen({
      ...header,
      lattice,
      sites: [
        {
          species: [
            { element: "Ag", occu: 0.5 },
            { element: "Pd", occu: 0.5 },
          ],
          abc: [0, 0, 0],
          label: "M",
        },
        { species: [{ element: "Li", occu: 0.691 }], abc: [0.5, 0.5, 0.5] },
        { species: [{ element: "O", occu: 1 }], abc: [0.5, 0, 0] },
      ],
    });
    expect(isDisordered(s)).toBe(true);
    if (!isDisordered(s)) return;
    expect(s.sites.map((site) => site.occupancy)).toEqual([
      [
        { symbol: "Ag", fraction: 0.5 },
        { symbol: "Pd", fraction: 0.5 },
      ],
      [{ symbol: "Li", fraction: 0.691 }],
      [{ symbol: "O", fraction: 1 }],
    ]);
    expect(s.sites[0].properties).toEqual({ label: "M" });
  });

  it("round-trips disordered sites as multi-species sites", () => {
    const out = toPymatgen(alloy);
    expect(out.sites[1].species).toEqual([
      { element: "Cl", occu: 0.5 },
      { element: "Br", occu: 0.5 },
    ]);
    expect(out.sites[1].xyz).toEqual([2, 2, 2]);
    expect(out.sites[1].label).toBe("Cl:0.500, Br:0.500");
    expect(fromPymatgen(out)).toEqual({
      ...alloy,
      charge: 0,
      properties: {},
      sites: alloy.sites.map((site, i) => ({
        ...site,
        properties: { label: out.sites[i].label },
      })),
    });
  });

  it("rejects overfilled sites", () => {
    expect(() =>
      fromPymatgen({
        ...header,
        lattice,
        sites: [
          {
            species: [
              { element: "Ag", occu: 0.7 },
              { element: "Pd", occu: 0.5 },
            ],
            abc: [0, 0, 0],
          },
        ],
      }),
    ).toThrow(/sum/);
  });
});
