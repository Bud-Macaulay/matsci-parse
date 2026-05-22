import { describe, it, expect } from "vitest";
import { replaceSite } from "@/core/structure/operations/sites/replaceSite";

describe("replaceSite", () => {
  it("replaces site at index", () => {
    const structure = {
      lattice: {},
      sites: [
        { species: "A", frac: [0, 0, 0] },
        { species: "B", frac: [0, 0, 0] },
      ],
    };

    const site = { species: "X", frac: [1, 1, 1] };

    const result = replaceSite(structure, 0, site);

    expect(result.sites[0]).toEqual(site);
    expect(result.sites[1].species).toBe("B");
  });

  it("does not mutate input", () => {
    const structure = {
      lattice: {},
      sites: [{ species: "A", frac: [0, 0, 0] }],
    };

    replaceSite(structure, 0, { species: "B", frac: [0, 0, 0] });

    expect(structure.sites[0].species).toBe("A");
  });
});
