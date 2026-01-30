import { structureToPoscar, poscarToStructure } from "../lib/io/vasp/poscar";
import { vectorsNearlyEqual } from "./helpers";
import { rockSalt, diamond, singleAtom } from "./files/crystalstructures";

describe("POSCAR parsing", () => {
  test("simple POSCAR round-trip (rockSalt)", () => {
    const poscar = structureToPoscar(rockSalt);
    const parsed = poscarToStructure(poscar);

    expect(parsed.numSites).toBe(rockSalt.numSites);

    // check that all species are present, ignoring order
    expect(parsed.species.sort()).toEqual(rockSalt.species.slice().sort());

    // check lattice vectors
    for (let i = 0; i < 3; i++) {
      vectorsNearlyEqual(parsed.lattice[i], rockSalt.lattice[i]);
    }
  });

  test("multi-element POSCAR round-trip (diamond)", () => {
    const poscar = structureToPoscar(diamond);
    const parsed = poscarToStructure(poscar);

    expect(parsed.numSites).toBe(diamond.numSites);
    expect(parsed.species.sort()).toEqual(diamond.species.slice().sort());

    for (let i = 0; i < 3; i++) {
      vectorsNearlyEqual(parsed.lattice[i], diamond.lattice[i]);
    }
  });

  test("single-atom POSCAR round-trip", () => {
    const poscar = structureToPoscar(singleAtom);
    const parsed = poscarToStructure(poscar);

    expect(parsed.numSites).toBe(singleAtom.numSites);
    expect(parsed.species).toEqual(singleAtom.species);
  });
});
