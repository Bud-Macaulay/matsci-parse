import { structureToPoscar, poscarToStructure } from "../lib/io/vasp/poscar";
import { vectorsNearlyEqual } from "./helpers";
import {
  simplePoscar,
  multiElementPoscar,
  selectiveDynamicsPoscar,
} from "./files/poscarStrings";

describe("POSCAR parsing (round-trip)", () => {
  test("simple POSCAR round-trip (rock salt)", () => {
    const first = poscarToStructure(simplePoscar);
    const poscar = structureToPoscar(first);
    const second = poscarToStructure(poscar);

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));

    expect(first.numSites).toBe(second.numSites);
    expect(first.species.sort()).toEqual(second.species.slice().sort());
  });

  test("multi-element POSCAR round-trip (diamond)", () => {
    const first = poscarToStructure(multiElementPoscar);
    const poscar = structureToPoscar(first);
    const second = poscarToStructure(poscar);

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));
    expect(first.numSites).toBe(second.numSites);
    expect(first.species.sort()).toEqual(second.species.slice().sort());
  });

  test("POSCAR selective dynamics round-trip", () => {
    const first = poscarToStructure(selectiveDynamicsPoscar);
    const poscar = structureToPoscar(first);
    const second = poscarToStructure(poscar);

    first.lattice.forEach((v, i) => vectorsNearlyEqual(v, second.lattice[i]));
    expect(first.numSites).toBe(second.numSites);
    expect(first.species.sort()).toEqual(second.species.slice().sort());
  });
});
