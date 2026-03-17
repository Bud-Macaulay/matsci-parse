import { pwToStructure } from "../../lib/io/qe/pw";
import { structureToPoscar, poscarToStructure } from "../../lib/main";

import { cifToStructure } from "../../lib/main";

import {
  copperPw,
  siPw,
  testPw,
  test2cifEquiv,
  test2pw,
} from "../files/pwStrings";

import "../../tests/helpers/structureMatchers"; // for toStructureNearlyEqual

describe("QE tests", () => {
  test("Copper QE input converts to valid POSCAR", () => {
    const structure = pwToStructure(copperPw);

    const poscarString = structureToPoscar(structure);
    const parsed = poscarToStructure(poscarString);

    expect(parsed.numSites).toBe(structure.numSites);
    expect(parsed.species).toEqual(structure.species);
    expect(parsed.cartCoords(0)).toEqual(structure.cartCoords(0));
  });

  test("Silicon QE input converts to valid POSCAR", () => {
    const structure = pwToStructure(siPw);

    const poscarString = structureToPoscar(structure);

    const parsed = poscarToStructure(poscarString);

    expect(parsed.numSites).toBe(structure.numSites);
    expect(parsed.species).toEqual(structure.species);
    expect(parsed.cartCoords(0)).toEqual(structure.cartCoords(0));
  });

  test("test1 QE input converts to valid POSCAR", () => {
    const structure = pwToStructure(siPw);

    const poscarString = structureToPoscar(structure);

    const parsed = poscarToStructure(poscarString);

    expect(parsed.numSites).toBe(structure.numSites);
    expect(parsed.species).toEqual(structure.species);
    expect(parsed.cartCoords(0)).toEqual(structure.cartCoords(0));
  });

  test("CIF vs QE input produces the same structure", () => {
    const fromCif = cifToStructure(test2cifEquiv);
    const fromPw = pwToStructure(test2pw);

    // compare full structures
    expect(fromCif).toStructureNearlyEqual(fromPw);
  });
});
