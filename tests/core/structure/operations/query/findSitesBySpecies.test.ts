import { describe, it, expect } from "vitest";

import { findSitesBySpecies } from "@/core/structure/operations/query/findSitesBySpecies";

describe("findSitesBySpecies", () => {
  const structure = {
    lattice: {},
    sites: [
      { species: { symbol: "Si" }, frac: [0, 0, 0] },
      { species: { symbol: "O" }, frac: [0.5, 0.5, 0.5] },
      { species: { symbol: "Si" }, frac: [0.25, 0.25, 0.25] },
    ],
  };

  it("finds all sites with matching species", () => {
    const result = findSitesBySpecies(structure, "Si");

    const resultO = findSitesBySpecies(structure, "O");

    expect(result).toEqual([0, 2]);
    expect(resultO).toEqual([1]);
  });

  it("does not mutate structure", () => {
    const before = structuredClone(structure);

    findSitesBySpecies(structure, { symbol: "Si" });

    expect(structure).toEqual(before);
  });
});
