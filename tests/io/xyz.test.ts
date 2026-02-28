import "../../tests/helpers/structureMatchers"; // load the matcher globally
import { xyzToStructure, structureToXyz } from "../../lib/io/xyz/xyz";
import { rockSalt, diamond, singleAtom } from "../files/crystalstructures";
import {
  classicXyz,
  extendedXyz,
  extendedXyzSelective,
} from "../files/xyzStrings";

describe("XYZ parsing (round-trip)", () => {
  test("rockSalt XYZ round-trip", () => {
    const first = xyzToStructure(structureToXyz(rockSalt));
    const second = xyzToStructure(structureToXyz(first));

    expect(first).toStructureNearlyEqual(second);
  });

  test("diamond XYZ round-trip", () => {
    const first = xyzToStructure(structureToXyz(diamond));
    const second = xyzToStructure(structureToXyz(first));

    expect(first).toStructureNearlyEqual(second);
  });

  test("single-atom XYZ round-trip", () => {
    const first = xyzToStructure(structureToXyz(singleAtom));
    const second = xyzToStructure(structureToXyz(first));

    expect(first).toStructureNearlyEqual(second);
  });

  test("extended XYZ with selective dynamics round-trip", () => {
    const first = xyzToStructure(extendedXyzSelective);
    const second = xyzToStructure(structureToXyz(first));

    // selectiveDynamics is a property of sites, so check separately
    for (let i = 0; i < first.numSites; i++) {
      expect(second.sites[i].props.selectiveDynamics).toEqual(
        first.sites[i].props.selectiveDynamics,
      );
    }

    expect(first).toStructureNearlyEqual(second);
  });

  test("classic XYZ should throw", () => {
    expect(() => xyzToStructure(classicXyz)).toThrow();
  });
});
