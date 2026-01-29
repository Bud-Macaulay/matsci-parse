import { CrystalStructure } from "../lib/io/crystal";
import { xsfToStructure, structureToXsf } from "../lib/io/xsf/xsf";
import { vectorsNearlyEqual } from "./helpers";

describe("XSF parsing and round-trip", () => {
  test("round-trip XSF with NaCl lattice", () => {
    const structure = new CrystalStructure({
      lattice: [
        [3, 0, 0],
        [0, 3, 0],
        [0, 0, 3],
      ],
      species: ["Na", "Cl"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 1, cart: [1.5, 1.5, 1.5] },
      ],
    });

    const xsf = structureToXsf(structure);
    const parsed = xsfToStructure(xsf);

    // lattice
    for (let i = 0; i < 3; i++) {
      vectorsNearlyEqual(parsed.lattice[i], structure.lattice[i]);
    }

    // species
    expect(parsed.species.sort()).toEqual(structure.species.sort());

    // sites
    expect(parsed.numSites).toBe(structure.numSites);
    for (let i = 0; i < structure.numSites; i++) {
      vectorsNearlyEqual(parsed.sites[i].cart, structure.sites[i].cart);
      expect(parsed.species[parsed.sites[i].speciesIndex]).toBe(
        structure.species[structure.sites[i].speciesIndex],
      );
    }
  });

  test("round-trip XSF with single-element lattice (Si)", () => {
    const structure = new CrystalStructure({
      lattice: [
        [2, 0, 0],
        [0, 2, 0],
        [0, 0, 2],
      ],
      species: ["Si"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [1, 1, 1] },
      ],
    });

    const xsf = structureToXsf(structure);
    const parsed = xsfToStructure(xsf);

    expect(parsed.species.length).toBe(1);
    expect(parsed.species[0]).toBe("Si");
    expect(parsed.numSites).toBe(2);
  });

  test("parse XSF from string", () => {
    const xsfText = `
CRYSTAL
PRIMVEC
3.0 0 0
0 3.0 0
0 0 3.0
PRIMCOORD
2 1
Na 0 0 0
Cl 1.5 1.5 1.5
`;

    const parsed = xsfToStructure(xsfText);

    expect(parsed.species.sort()).toEqual(["Cl", "Na"]);
    expect(parsed.numSites).toBe(2);
    expect(
      parsed.sites.map((s) => parsed.species[s.speciesIndex]).sort(),
    ).toEqual(["Cl", "Na"]);
  });
});
