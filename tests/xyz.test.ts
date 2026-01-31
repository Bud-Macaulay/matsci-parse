import { xyzToStructure, structureToXyz } from "../lib/io/xyz/xyz";
import { vectorsNearlyEqual } from "./helpers";
import { rockSalt, diamond, singleAtom } from "./files/crystalstructures";
import {
  classicXyz,
  extendedXyz,
  extendedXyzSelective,
} from "./files/xyzStrings";

describe("XYZ parsing (round-trip)", () => {
  test("rockSalt XYZ round-trip", () => {
    const first = xyzToStructure(structureToXyz(rockSalt));
    const second = xyzToStructure(structureToXyz(first));

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));
    expect(first.numSites).toBe(second.numSites);
    expect(first.species.sort()).toEqual(second.species.slice().sort());

    for (let i = 0; i < first.numSites; i++) {
      expect(first.sites[i].speciesIndex).toBe(second.sites[i].speciesIndex);
      vectorsNearlyEqual(first.sites[i].cart, second.sites[i].cart);
    }
  });

  test("diamond XYZ round-trip", () => {
    const first = xyzToStructure(structureToXyz(diamond));
    const second = xyzToStructure(structureToXyz(first));

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));
    expect(first.numSites).toBe(second.numSites);
    expect(first.species).toEqual(second.species);

    for (let i = 0; i < first.numSites; i++) {
      expect(first.sites[i].speciesIndex).toBe(second.sites[i].speciesIndex);
      vectorsNearlyEqual(first.sites[i].cart, second.sites[i].cart);
    }
  });

  test("single-atom XYZ round-trip", () => {
    const first = xyzToStructure(structureToXyz(singleAtom));
    const second = xyzToStructure(structureToXyz(first));

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));
    expect(first.species).toEqual(second.species);
    expect(first.numSites).toBe(second.numSites);
    expect(first.sites[0].speciesIndex).toBe(second.sites[0].speciesIndex);
    vectorsNearlyEqual(first.sites[0].cart, second.sites[0].cart);
  });

  test("extended XYZ with selective dynamics round-trip", () => {
    const first = xyzToStructure(extendedXyzSelective);
    const second = xyzToStructure(structureToXyz(first));

    expect(first.numSites).toBe(second.numSites);

    for (let i = 0; i < first.numSites; i++) {
      expect(second.sites[i].props.selectiveDynamics).toEqual(
        first.sites[i].props.selectiveDynamics,
      );
      vectorsNearlyEqual(first.sites[i].cart, second.sites[i].cart);
    }
  });

  test("classic XYZ should throw", () => {
    expect(() => xyzToStructure(classicXyz)).toThrow();
  });
});
