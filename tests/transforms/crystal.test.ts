import { CrystalStructure } from "../../lib/io/crystal";
import { Site, CartesianCoords } from "../../lib/io/common";
import { vectorsNearlyEqual } from "../helpers/structureMatchers";

function baseStructure() {
  return new CrystalStructure({
    lattice: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    species: ["H"],
    sites: [new Site(0, [0, 0, 0])],
  });
}

describe("CrystalStructure accessors", () => {
  const lattice: CartesianCoords[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const species = ["Na", "Cl"];
  const sites = [new Site(0, [0, 0, 0]), new Site(1, [0.5, 0.5, 0.5])];

  const cs = new CrystalStructure({ lattice, species, sites });

  test("site() returns the correct Site object", () => {
    const site0 = cs.site(0);
    const site1 = cs.site(1);

    expect(site0.speciesIndex).toBe(sites[0].speciesIndex);
    expect(site1.speciesIndex).toBe(sites[1].speciesIndex);

    vectorsNearlyEqual(site0.cart, sites[0].cart);
    vectorsNearlyEqual(site1.cart, sites[1].cart);
  });

  test("site() returns undefined for out-of-bounds index", () => {
    expect(cs.site(-1)).toBeUndefined();
    expect(cs.site(10)).toBeUndefined();
  });

  test("siteSpecies() returns the correct chemical species", () => {
    expect(cs.siteSpecies(0)).toBe("Na");
    expect(cs.siteSpecies(1)).toBe("Cl");
  });

  test("elements getter returns all species", () => {
    expect(cs.elements).toEqual(species);
  });

  test("numSites getter returns the correct number of sites", () => {
    expect(cs.numSites).toBe(sites.length);
  });
});

/*
Tests that check that the internal validator is working (in the case the library is being used as js)
*/
describe("Validation / Edge cases", () => {
  test("applyLatticeTransformation variants + invalid", () => {
    const cs = baseStructure();
    cs.applyLatticeTransformation(2);
    cs.applyLatticeTransformation([2, 3, 4]);
    cs.applyLatticeTransformation([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(() => cs.applyLatticeTransformation([1, 2] as any)).toThrow();
  });

  test("addSite edge positions", () => {
    const cs = baseStructure();

    cs.addSite("H", [1, 1, 1]);
    cs.addSite("O", [2, 2, 2]);
    cs.addSite("C", [3, 3, 3], 0);
    cs.addSite("N", [4, 4, 4], 1);
    cs.addSite("S", [5, 5, 5], 999);
    cs.addSite("P", [6, 6, 6], -1);
  });

  test("removeSite branches", () => {
    const cs = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["H", "O"],
      sites: [new Site(0, [0, 0, 0]), new Site(1, [1, 1, 1])],
    });

    cs.removeSite(1);

    expect(() => cs.removeSite(999)).toThrow();
  });

  test("removeSite keeps species if still used", () => {
    const cs = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["H"],
      sites: [new Site(0, [0, 0, 0]), new Site(0, [1, 1, 1])],
    });

    cs.removeSite(0);
    expect(cs.species.length).toBe(1);
  });

  test("replaceSite valid + invalid", () => {
    const cs = baseStructure();

    cs.replaceSite(0, "O");

    expect(() => cs.replaceSite(999, "X")).toThrow();
  });

  test("invalid lattice", () => {
    expect(
      () =>
        new CrystalStructure({
          lattice: [
            [1, 2],
            [3, 4],
            [5, 6],
          ] as any,
          species: ["H"],
          sites: [],
        }),
    ).toThrow();
  });

  test("invalid lattice: not array or wrong length", () => {
    expect(
      () =>
        new CrystalStructure({
          lattice: "not-an-array" as any,
          species: ["H"],
          sites: [],
        }),
    ).toThrow("Lattice must be a 3x3 matrix");

    expect(
      () =>
        new CrystalStructure({
          lattice: [
            [1, 0, 0],
            [0, 1, 0],
          ] as any,
          species: ["H"],
          sites: [],
        }),
    ).toThrow("Lattice must be a 3x3 matrix");
  });

  test("invalid species", () => {
    expect(
      () =>
        new CrystalStructure({
          lattice: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          species: "not-array" as any,
          sites: [],
        }),
    ).toThrow();

    expect(
      () =>
        new CrystalStructure({
          lattice: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          species: [1, 2] as any,
          sites: [],
        }),
    ).toThrow();
  });

  test("invalid sites", () => {
    expect(
      () =>
        new CrystalStructure({
          lattice: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          species: ["H"],
          sites: [{ speciesIndex: 5, cart: [0, 0, 0] }] as any,
        }),
    ).toThrow();

    expect(
      () =>
        new CrystalStructure({
          lattice: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          species: ["H"],
          sites: [{}] as any,
        }),
    ).toThrow();
  });

  test("invalid sites: not an array", () => {
    expect(
      () =>
        new CrystalStructure({
          lattice: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          species: ["H"],
          sites: "not-an-array" as any,
        }),
    ).toThrow("Sites must be an array");
  });
});
