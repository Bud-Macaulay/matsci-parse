/* eslint-disable no-undef */
import { CrystalStructure, Site } from "../lib/io/crystal";
import { poscarToStructure, structureToPoscar } from "../lib/io/vasp/poscar";
import { vectorsNearlyEqual } from "./helpers";

describe("POSCAR round-trip tests", () => {
  test("CrystalStructure basic sanity", () => {
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

    expect(structure.numSites).toBe(2);
    expect(structure.elements).toEqual(["Na", "Cl"]);
    expect(structure.siteSpecies(1)).toBe("Cl");
  });

  test("Structure -> POSCAR string", () => {
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

    const poscar = structureToPoscar(structure);

    expect(poscar).toContain("Na Cl");
    expect(poscar).toContain("1 1");
    expect(poscar).toContain("Cartesian");
  });

  test("POSCAR -> Structure parsing", () => {
    const poscar = `
Ge1 Pb1 O3
1.0
   3.8884369999999979    0.0000000000000000    0.0000000000000002
  -0.0000000000000002    3.8884369999999979    0.0000000000000002
   0.0000000000000000    0.0000000000000000    3.8884369999999979
Ge Pb O
1 1 3
direct
   0.5000000000000000    0.5000000000000000    0.5000000000000000 Ge4+
   0.0000000000000000    0.0000000000000000    0.0000000000000000 Pb2+
   0.0000000000000000    0.5000000000000000    0.5000000000000000 O2-
   0.5000000000000000    0.5000000000000000    0.0000000000000000 O2-
   0.5000000000000000    0.0000000000000000    0.5000000000000000 O2-

`;

    const structure = poscarToStructure(poscar);

    expect(structure.numSites).toBe(5);
    expect(structure.species).toEqual(["Ge", "Pb", "O"]);
    vectorsNearlyEqual(structure.cartCoords(1), [0, 0, 0]);
  });

  test("POSCAR round-trip preserves lattice, species, and sites", () => {
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

    const poscar = structureToPoscar(original);
    const parsed = poscarToStructure(poscar);

    // lattice
    for (let i = 0; i < 3; i++) {
      vectorsNearlyEqual(parsed.lattice[i], original.lattice[i]);
    }

    // species
    expect(parsed.species).toEqual(original.species);

    // sites
    expect(parsed.numSites).toBe(original.numSites);
    for (let i = 0; i < original.numSites; i++) {
      expect(parsed.siteSpecies(i)).toBe(original.siteSpecies(i));
      vectorsNearlyEqual(parsed.cartCoords(i), original.cartCoords(i));
    }
  });
});
