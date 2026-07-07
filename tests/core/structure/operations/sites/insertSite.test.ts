import { describe, it, expect } from "vitest";
import { insertSite } from "@/core/structure/operations/sites/insertSite";

// TODO: improve this test

describe("insertSite", () => {
  it("adds a site at the end", () => {
    const structure = {
      lattice: {},
      sites: [{ species: "A", frac: [0, 0, 0] }],
    };

    const site = { species: "B", frac: [0.5, 0.5, 0.5] };

    const result = insertSite(structure, 1, site);

    expect(result.sites).toHaveLength(2);
    expect(result.sites[1]).toEqual(site);
  });

  it("does not mutate input", () => {
    const structure = {
      lattice: {},
      sites: [],
    };

    const site = { species: "A", frac: [0, 0, 0] };

    const result = insertSite(structure, 0, site);

    expect(structure.sites).toHaveLength(0);
    expect(result.sites).toHaveLength(1);
  });

  it("adds a site in middle", () => {
    const siteA = { species: "A", frac: [0, 0, 0] };
    const siteB = { species: "B", frac: [0.5, 0.5, 0.5] };
    const siteC = { species: "C", frac: [0.25, 0.25, 0.25] };

    const structure = {
      lattice: {},
      sites: [siteA, siteC],
    };

    const result = insertSite(structure, 1, siteB);

    expect(result.sites).toHaveLength(3);
    expect(result.sites).toEqual([siteA, siteB, siteC]);
  });

  it("no mutation", () => {
    const structure = {
      lattice: {},
      sites: [],
    };

    const site = { species: "A", frac: [0, 0, 0] };

    const result = insertSite(structure, 0, site);

    expect(structure.sites).toHaveLength(0);
    expect(result.sites).toHaveLength(1);
  });
});
