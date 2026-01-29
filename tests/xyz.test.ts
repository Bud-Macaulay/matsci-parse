/* eslint-disable no-undef */
import { CrystalStructure } from "../lib/io/crystal";
import { xyzToStructure, structureToXyz } from "../lib/io/xyz/xyz";
import { vectorsNearlyEqual } from "./helpers";

import { rockSalt } from "./files/crystalstructures";

describe("XYZ parsing and round-trip", () => {
  test("structure -> xyz string", () => {
    const xyz = structureToXyz(rockSalt);

    expect(xyz.startsWith("4")).toBe(true);
    expect(xyz).toContain("Na");
    expect(xyz).toContain("Cl");
  });

  test("classic xyz -> structure", () => {
    const xyz = `
2
NaCl molecule
Na 0 0 0
Cl 1.5 1.5 1.5
`;

    expect(() => xyzToStructure(xyz)).toThrow();
  });

  test("extended xyz with lattice", () => {
    const xyz = `
2
Lattice="3 0 0 0 3 0 0 0 3" Properties=species:S:1:pos:R:3
Na 0 0 0
Cl 1.5 1.5 1.5
`;

    const structure = xyzToStructure(xyz);

    expect(structure.numSites).toBe(2);

    vectorsNearlyEqual(structure.lattice[0], [3, 0, 0]);
    vectorsNearlyEqual(structure.lattice[1], [0, 3, 0]);
    vectorsNearlyEqual(structure.lattice[2], [0, 0, 3]);

    expect(structure.species).toEqual(["Na", "Cl"]);
    vectorsNearlyEqual(structure.cartCoords(1), [1.5, 1.5, 1.5]);
  });

  test("round-trip extended xyz preserves lattice, species, and sites", () => {
    const original = new CrystalStructure({
      lattice: [
        [4, 0.1, 0],
        [0, 4, 0.2],
        [0, 0, 4],
      ],
      species: ["Si"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [2, 2, 2] },
      ],
    });

    const xyz = structureToXyz(original);
    const parsed = xyzToStructure(xyz);

    // lattice
    for (let i = 0; i < 3; i++) {
      vectorsNearlyEqual(parsed.lattice[i], original.lattice[i]);
    }

    // species
    expect(parsed.species).toEqual(original.species);

    // sites
    expect(parsed.numSites).toBe(original.numSites);
    for (let i = 0; i < original.numSites; i++) {
      expect(parsed.sites[i].speciesIndex).toBe(original.sites[i].speciesIndex);
      vectorsNearlyEqual(parsed.sites[i].cart, original.sites[i].cart);
    }
  });

  test("error handling for broken xyz", () => {
    expect(() => {
      xyzToStructure(`
2
Broken
Na 0 0
Cl 1 1 1
`);
    }).toThrow();

    expect(() => {
      xyzToStructure(`
2
Properties=species:S:1
Na 0 0 0
Cl 1 1 1
`);
    }).toThrow();
  });
});
