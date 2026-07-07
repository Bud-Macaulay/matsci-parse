import { describe, it, expect } from "vitest";

import { findSites } from "@/core/structure/operations/query/findSites";
import { findSitesBySpecies } from "@/core/structure/operations/query/findSitesBySpecies";

describe("findSites", () => {
  const structure = {
    lattice: {},
    sites: [
      { species: "Si", frac: [0, 0, 0] },
      { species: "O", frac: [0.5, 0.5, 0.5] },
      { species: "Si", frac: [0.25, 0.25, 0.25] },
    ],
  };

  it("returns indices matching predicate", () => {
    const result = findSites(structure, (site) => site.species === "Si");

    expect(result).toEqual([0, 2]);
  });

  it("passes the site index to predicate", () => {
    const result = findSites(structure, (_, index) => index === 1);

    expect(result).toEqual([1]);
  });

  it("returns empty array when nothing matches", () => {
    const result = findSites(structure, (site) => site.species === "C");

    expect(result).toEqual([]);
  });
});
