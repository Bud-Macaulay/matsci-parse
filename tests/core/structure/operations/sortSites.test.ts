import { describe, it, expect } from "vitest";
import { sortSites } from "@/core/structure/operations/sortSites";
import { createSite } from "@/core/site/site";
import { createSpecies } from "@/core/species/species";

describe("sortSites", () => {
  it("sorts by species symbol alphabetically", () => {
    const sites = [
      createSite(createSpecies("Si"), new Float64Array([0.5, 0.5, 0.5])),
      createSite(createSpecies("Al"), new Float64Array([0.0, 0.0, 0.0])),
      createSite(createSpecies("Mg"), new Float64Array([0.25, 0.25, 0.25])),
    ];

    const sorted = sortSites(sites);

    expect(sorted[0].species.symbol).toBe("Al");
    expect(sorted[1].species.symbol).toBe("Mg");
    expect(sorted[2].species.symbol).toBe("Si");
  });

  it("sorts by fractional coordinates within same species", () => {
    const sites = [
      createSite(createSpecies("Si"), new Float64Array([0.5, 0.5, 0.5])),
      createSite(createSpecies("Si"), new Float64Array([0.0, 0.0, 0.0])),
      createSite(createSpecies("Si"), new Float64Array([0.25, 0.25, 0.25])),
    ];

    const sorted = sortSites(sites);

    expect(sorted[0].frac[0]).toBe(0.0);
    expect(sorted[1].frac[0]).toBe(0.25);
    expect(sorted[2].frac[0]).toBe(0.5);
  });

  it("does not mutate the input array", () => {
    const sites = [
      createSite(createSpecies("Si"), new Float64Array([0.5, 0.5, 0.5])),
      createSite(createSpecies("Al"), new Float64Array([0.0, 0.0, 0.0])),
    ];

    const sorted = sortSites(sites);

    expect(sites[0].species.symbol).toBe("Si");
    expect(sorted[0].species.symbol).toBe("Al");
  });
});
