import { describe, it, expect } from "vitest";

import { findSitesBySpecies } from "@/core/structure/operations/query/findSitesBySpecies";

describe("findSitesBySpecies", () => {
  const structure = {
    lattice: {},
    sites: [
      { species: "Si", frac: [0, 0, 0] },
      { species: "O", frac: [0.5, 0.5, 0.5] },
      { species: "Si", frac: [0.25, 0.25, 0.25] },
    ],
  };

  it("finds all sites with matching species", () => {
    const result = findSitesBySpecies(structure, "Si");

    expect(result).toEqual([0, 2]);
  });

  it("does not mutate structure", () => {
    const before = structuredClone(structure);

    findSitesBySpecies(structure, "Si");

    expect(structure).toEqual(before);
  });
});
