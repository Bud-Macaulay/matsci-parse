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
    // Periodic-table order (O, Z=8 before Si, Z=14), not insertion order.
    expect(species.map((s) => s.symbol)).toEqual(["O", "Si"]);
  });

  it("gets unique elements", () => {
    const elements = getElements(structure);

    expect(elements).toEqual(["O", "Si"]);
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
