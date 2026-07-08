import { describe, it, expect } from "vitest";

import {
  getSpecies,
  getElements,
  getSpeciesCounts,
} from "@/core/structure/properties/species";

describe("species properties", () => {
  const structure = {
    lattice: {},
    sites: [
      {
        species: { symbol: "Si" },
        frac: [0, 0, 0],
      },
      {
        species: { symbol: "O" },
        frac: [0.25, 0.25, 0.25],
      },
      {
        species: { symbol: "O" },
        frac: [0.5, 0.5, 0.5],
      },
    ],
  };

  it("gets unique species", () => {
    const species = getSpecies(structure);

    expect(species).toHaveLength(2);
    expect(species.map((s) => s.symbol)).toEqual(["Si", "O"]);
  });

  it("gets unique elements", () => {
    const elements = getElements(structure);

    expect(elements).toEqual(["Si", "O"]);
  });

  it("counts species", () => {
    const counts = getSpeciesCounts(structure);

    expect(counts.get("Si")).toBe(1);
    expect(counts.get("O")).toBe(2);
  });

  it("does not depend on species object identity", () => {
    const duplicatedObjects = {
      lattice: {},
      sites: [
        {
          species: { symbol: "Si" },
          frac: [0, 0, 0],
        },
        {
          species: { symbol: "Si" },
          frac: [0.5, 0.5, 0.5],
        },
      ],
    };

    const species = getSpecies(duplicatedObjects);

    expect(species).toHaveLength(1);
    expect(species[0].symbol).toBe("Si");
  });
});
