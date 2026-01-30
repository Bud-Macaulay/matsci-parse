import { xyzToStructure, structureToXyz } from "../lib/io/xyz/xyz";
import { vectorsNearlyEqual } from "./helpers";
import { rockSalt, diamond, singleAtom } from "./files/crystalstructures";
import {
  classicXyz,
  extendedXyz,
  extendedXyzSelective,
} from "./files/xyzStrings";

describe("XYZ parsing and round-trip", () => {
  test("structure -> xyz string (rockSalt)", () => {
    const xyz = structureToXyz(rockSalt);
    expect(xyz.startsWith(String(rockSalt.numSites))).toBe(true);
    expect(xyz).toContain("Na");
    expect(xyz).toContain("Cl");
  });

  test("classic XYZ should throw", () => {
    expect(() => xyzToStructure(classicXyz)).toThrow();
  });

  test("extended XYZ parses correctly", () => {
    const structure = xyzToStructure(extendedXyz);
    expect(structure.numSites).toBe(2);
    expect(structure.species).toEqual(["Na", "Cl"]);

    vectorsNearlyEqual(structure.lattice[0], [3, 0, 0]);
    vectorsNearlyEqual(structure.lattice[1], [0, 3, 0]);
    vectorsNearlyEqual(structure.lattice[2], [0, 0, 3]);

    vectorsNearlyEqual(structure.cartCoords(1), [1.5, 1.5, 1.5]);
  });

  test("round-trip extended XYZ preserves diamond", () => {
    const xyz = structureToXyz(diamond);
    const parsed = xyzToStructure(xyz);
    for (let i = 0; i < 3; i++)
      vectorsNearlyEqual(parsed.lattice[i], diamond.lattice[i]);
    expect(parsed.species).toEqual(diamond.species);
    for (let i = 0; i < diamond.numSites; i++) {
      expect(parsed.sites[i].speciesIndex).toBe(diamond.sites[i].speciesIndex);
      vectorsNearlyEqual(parsed.sites[i].cart, diamond.sites[i].cart);
    }
  });

  test("round-trip extended XYZ preserves single atom structure", () => {
    const xyz = structureToXyz(singleAtom);
    const parsed = xyzToStructure(xyz);
    for (let i = 0; i < 3; i++)
      vectorsNearlyEqual(parsed.lattice[i], singleAtom.lattice[i]);
    expect(parsed.species).toEqual(singleAtom.species);
    expect(parsed.numSites).toBe(singleAtom.numSites);
    expect(parsed.sites[0].speciesIndex).toBe(singleAtom.sites[0].speciesIndex);
    vectorsNearlyEqual(parsed.sites[0].cart, singleAtom.sites[0].cart);
  });

  test("round-trip extended XYZ preserves selective dynamics", () => {
    const structure = xyzToStructure(extendedXyzSelective);
    const xyz = structureToXyz(structure);
    const parsed = xyzToStructure(xyz);

    console.log(xyz);

    expect(parsed.numSites).toBe(2);

    for (let i = 0; i < 2; i++) {
      expect(parsed.sites[i].props.selectiveDynamics).toEqual(
        structure.sites[i].props.selectiveDynamics,
      );

      vectorsNearlyEqual(parsed.sites[i].cart, structure.sites[i].cart);
    }
  });
});
