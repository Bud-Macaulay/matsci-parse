import { describe, it, expect } from "vitest";

import {
  getSpecies,
  getElements,
  getSpeciesCounts,
} from "@/core/structure/properties/species";

import { siDiamond, tiO2Rutile } from "../../../fixtures/structures";

describe("species properties", () => {
  it("gets unique species", () => {
    const species = getSpecies(tiO2Rutile);

    expect(species).toHaveLength(2);
    // Periodic-table order (O, Z=8 before Ti, Z=22), not insertion order.
    expect(species.map((s) => s.symbol)).toEqual(["O", "Ti"]);
  });

  it("gets unique elements", () => {
    expect(getElements(tiO2Rutile)).toEqual(["O", "Ti"]);
  });

  it("counts species", () => {
    const counts = getSpeciesCounts(tiO2Rutile);

    expect(counts.get("Ti")).toBe(2);
    expect(counts.get("O")).toBe(4);
  });

  it("does not depend on species object identity", () => {
    // Every fixture site carries its own species object.
    const species = getSpecies(siDiamond);

    expect(species).toHaveLength(1);
    expect(species[0].symbol).toBe("Si");
  });
});
