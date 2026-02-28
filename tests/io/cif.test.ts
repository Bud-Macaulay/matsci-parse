import "../../tests/helpers/structureMatchers";
import { cifToStructure, structureToCif } from "../../lib/io/cif/cif";
import {
  rockSaltCif,
  diamondCif,
  singleAtomCif,
  multiLoopCif,
} from "../files/cifStrings";

describe("CIF parsing", () => {
  test("simple CIF round-trip (rock salt)", () => {
    const first = cifToStructure(rockSaltCif);
    const cif = structureToCif(first);
    const second = cifToStructure(cif);

    expect(first).toStructureNearlyEqual(second);
  });

  test("diamond CIF round-trip", () => {
    const first = cifToStructure(diamondCif);
    const cif = structureToCif(first);
    const second = cifToStructure(cif);

    expect(first).toStructureNearlyEqual(second);
  });

  test("single atom CIF round-trip", () => {
    const first = cifToStructure(singleAtomCif);
    const cif = structureToCif(first);
    const second = cifToStructure(cif);

    expect(first).toStructureNearlyEqual(second);
  });

  test("multi-loop CIF round-trip", () => {
    const first = cifToStructure(multiLoopCif);
    const cif = structureToCif(first);
    const second = cifToStructure(cif);

    expect(first).toStructureNearlyEqual(second);
  });
});
