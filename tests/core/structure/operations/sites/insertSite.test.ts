import { describe, it, expect } from "vitest";
import { insertSite, insertSites } from "@/core/structure/operations/sites/insertSite";
import { createLattice } from "@/core/lattice/lattice";
import { createSite } from "@/core/site/site";

const cubic = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

describe("insertSite", () => {
  it("adds a site at the end", () => {
    const siteA = createSite({ symbol: "A" }, [0, 0, 0]);
    const siteB = createSite({ symbol: "B" }, [0.5, 0.5, 0.5]);

    const structure = { lattice: cubic, sites: [siteA] };
    const result = insertSite(structure, 1, siteB);

    expect(result.sites).toHaveLength(2);
    expect(result.sites[0]).toEqual(siteA);
    expect(result.sites[1]).toEqual(siteB);
  });

  it("adds a site at the beginning", () => {
    const siteA = createSite({ symbol: "A" }, [0.5, 0.5, 0.5]);
    const siteB = createSite({ symbol: "B" }, [0, 0, 0]);

    const structure = { lattice: cubic, sites: [siteA] };
    const result = insertSite(structure, 0, siteB);

    expect(result.sites).toHaveLength(2);
    expect(result.sites[0]).toEqual(siteB);
    expect(result.sites[1]).toEqual(siteA);
  });

  it("adds a site in middle", () => {
    const siteA = createSite({ symbol: "A" }, [0, 0, 0]);
    const siteB = createSite({ symbol: "B" }, [0.5, 0.5, 0.5]);
    const siteC = createSite({ symbol: "C" }, [0.25, 0.25, 0.25]);

    const structure = { lattice: cubic, sites: [siteA, siteC] };
    const result = insertSite(structure, 1, siteB);

    expect(result.sites).toHaveLength(3);
    expect(result.sites).toEqual([siteA, siteB, siteC]);
  });

  it("does not mutate the original sites array", () => {
    const siteA = createSite({ symbol: "A" }, [0, 0, 0]);

    const structure = { lattice: cubic, sites: [siteA] };
    const result = insertSite(structure, 0, createSite({ symbol: "B" }, [0.5, 0.5, 0.5]));

    expect(structure.sites).toHaveLength(1);
    expect(result.sites).toHaveLength(2);
  });

  it("preserves other structure properties via spread", () => {
    const site = createSite({ symbol: "A" }, [0, 0, 0]);

    const structure = { lattice: cubic, sites: [], extra: "metadata" as const };
    const result = insertSite(structure, 0, site);

    expect(result.lattice).toBe(cubic);
    expect((result as any).extra).toBe("metadata");
  });
});

describe("insertSites", () => {
  it("inserts multiple sites in middle", () => {
    const siteA = createSite({ symbol: "A" }, [0, 0, 0]);
    const siteB = createSite({ symbol: "B" }, [0.25, 0.25, 0.25]);
    const siteC = createSite({ symbol: "C" }, [0.5, 0.5, 0.5]);
    const siteD = createSite({ symbol: "D" }, [0.75, 0.75, 0.75]);

    const structure = { lattice: cubic, sites: [siteA, siteD] };
    const result = insertSites(structure, 1, [siteB, siteC]);

    expect(result.sites).toHaveLength(4);
    expect(result.sites).toEqual([siteA, siteB, siteC, siteD]);
  });

  it("inserts multiple sites at the beginning", () => {
    const siteA = createSite({ symbol: "A" }, [0.5, 0.5, 0.5]);
    const siteB = createSite({ symbol: "B" }, [0.25, 0.25, 0.25]);

    const structure = { lattice: cubic, sites: [siteA] };
    const result = insertSites(structure, 0, [siteB]);

    expect(result.sites).toHaveLength(2);
    expect(result.sites[0]).toEqual(siteB);
    expect(result.sites[1]).toEqual(siteA);
  });

  it("does not mutate the original sites array", () => {
    const structure = { lattice: cubic, sites: [createSite({ symbol: "A" }, [0, 0, 0])] };
    const result = insertSites(structure, 0, [createSite({ symbol: "B" }, [0.5, 0.5, 0.5])]);

    expect(structure.sites).toHaveLength(1);
    expect(result.sites).toHaveLength(2);
  });
});
