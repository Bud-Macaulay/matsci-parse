import { structureToPoscar, poscarToStructure } from "../lib/io/vasp/poscar";
import { vectorsNearlyEqual } from "./helpers";
import { rockSalt, diamond, singleAtom } from "./files/crystalstructures";

import { CrystalStructure, Site } from "../lib/main";

describe("POSCAR parsing", () => {
  test("simple POSCAR round-trip (rockSalt)", () => {
    const poscar = structureToPoscar(rockSalt);
    const parsed = poscarToStructure(poscar);

    expect(parsed.numSites).toBe(rockSalt.numSites);

    expect(parsed.species.sort()).toEqual(rockSalt.species.slice().sort());

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

  test("POSCAR selective dynamics round-trip", () => {
    const structure = new CrystalStructure({
      lattice: rockSalt.lattice,
      species: rockSalt.species,
      sites: [
        new Site(0, [0, 0, 0], { selectiveDynamics: [true, true, false] }),
        new Site(1, [2.82, 2.82, 2.82], {
          selectiveDynamics: [false, false, false],
        }),
      ],
    });

    const poscar = structureToPoscar(structure);
    const parsed = poscarToStructure(poscar);

    expect(parsed.sites.length).toBe(2);

    parsed.sites.forEach((site, i) => {
      expect(site.props.selective).toEqual(structure.sites[i].props.selective);
      vectorsNearlyEqual(site.cart, structure.sites[i].cart);
    });
  });
});
