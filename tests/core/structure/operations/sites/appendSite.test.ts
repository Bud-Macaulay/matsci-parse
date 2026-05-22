import { describe, it, expect } from "vitest";
import { appendSite } from "@/core/structure/operations/sites/appendSite";

describe("appendSite", () => {
  it("adds a site at the end", () => {
    const structure = {
      lattice: {},
      sites: [{ species: "A", frac: [0, 0, 0] }],
    };

    const site = { species: "B", frac: [0.5, 0.5, 0.5] };

    const result = appendSite(structure, site);

    expect(result.sites).toHaveLength(2);
    expect(result.sites[1]).toEqual(site);
  });

  it("does not mutate input", () => {
    const structure = {
      lattice: {},
      sites: [],
    };

    const site = { species: "A", frac: [0, 0, 0] };

    const result = appendSite(structure, site);

    expect(structure.sites).toHaveLength(0);
    expect(result.sites).toHaveLength(1);
  });
});
