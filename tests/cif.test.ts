import { cifToStructure, structureToCif } from "../lib/io/cif/cif";
import { vectorsNearlyEqual } from "./helpers";
import { rockSaltCif, diamondCif, singleAtomCif } from "./files/cifStrings";

describe("CIF parsing", () => {
  test("simple CIF round-trip (rock salt)", () => {
    const first = cifToStructure(rockSaltCif);
    const cif = structureToCif(first);
    const second = cifToStructure(cif);

    expect(first.numSites).toBe(second.numSites);
    expect(first.species.sort()).toEqual(second.species.slice().sort());

    first.lattice.forEach((v, i) => {
      vectorsNearlyEqual(first.lattice[i], second.lattice[i]);
    });
  });

  test("diamond CIF round-trip", () => {
    const first = cifToStructure(diamondCif);
    const cif = structureToCif(first);
    const second = cifToStructure(cif);

    first.lattice.forEach((v, i) => {
      vectorsNearlyEqual(first.lattice[i], second.lattice[i]);
    });

    expect(first.numSites).toBe(second.numSites);

    expect(first.species.sort()).toEqual(second.species.slice().sort());
  });

  test("single atom CIF round-trip", () => {
    const first = cifToStructure(singleAtomCif);
    const cif = structureToCif(first);
    const second = cifToStructure(cif);

    first.lattice.forEach((v, i) => {
      vectorsNearlyEqual(first.lattice[i], second.lattice[i]);
    });

    expect(first.numSites).toBe(second.numSites);
    expect(first.species[0]).toBe(second.species[0]);
  });
});
