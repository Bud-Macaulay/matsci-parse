import "../../tests/helpers/structureMatchers";
import { structureToPoscar, poscarToStructure } from "../../lib/io/vasp/poscar";
import {
  simplePoscar,
  multiElementPoscar,
  selectiveDynamicsPoscar,
} from "../files/poscarStrings";

describe("POSCAR parsing (round-trip)", () => {
  test("simple POSCAR round-trip (rock salt)", () => {
    const first = poscarToStructure(simplePoscar);
    const poscar = structureToPoscar(first);
    const second = poscarToStructure(poscar);

    expect(first).toStructureNearlyEqual(second);
  });

  test("multi-element POSCAR round-trip (diamond)", () => {
    const first = poscarToStructure(multiElementPoscar);
    const poscar = structureToPoscar(first);
    const second = poscarToStructure(poscar);

    expect(first).toStructureNearlyEqual(second);
  });

  test("POSCAR selective dynamics round-trip", () => {
    const first = poscarToStructure(selectiveDynamicsPoscar);
    const poscar = structureToPoscar(first);
    const second = poscarToStructure(poscar);

    expect(first).toStructureNearlyEqual(second);
  });
});
