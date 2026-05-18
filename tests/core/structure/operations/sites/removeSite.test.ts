import { describe, it, expect } from "vitest";
import { removeSite } from "@/core/structure/operations/sites/removeSite";

describe("removeSite", () => {
  it("removes site by index", () => {
    const structure = {
      lattice: {},
      sites: [
        { species: "A", frac: [0, 0, 0] },
        { species: "B", frac: [0, 0, 0] },
        { species: "C", frac: [0, 0, 0] },
      ],
    };

    const result = removeSite(structure, 1);

    expect(result.sites.map((s) => s.species)).toEqual(["A", "C"]);
  });

  it("does not mutate input", () => {
    const structure = {
      lattice: {},
      sites: [{ species: "A", frac: [0, 0, 0] }],
    };

    removeSite(structure, 0);

    expect(structure.sites).toHaveLength(1);
  });
});
