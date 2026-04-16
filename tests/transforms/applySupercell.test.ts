import { CrystalStructure } from "../../lib/io/crystal";
import { Site, CartesianCoords } from "../../lib/io/common";
import { vectorsNearlyEqual } from "../helpers/structureMatchers";
import { makeSupercell } from "../../lib/io/math";

describe("makeSupercell", () => {
  const lattice: CartesianCoords[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  const species = ["Na", "Cl"];
  const sites = [new Site(0, [0, 0, 0]), new Site(1, [0.5, 0.5, 0.5])];

  const cs = new CrystalStructure({ lattice, species, sites });

  test("1x1x1 returns identical structure", () => {
    const sc = makeSupercell(cs, [1, 1, 1]);

    expect(sc.sites.length).toBe(cs.sites.length);

    sc.lattice.forEach((v, i) => vectorsNearlyEqual(v, lattice[i]));

    sc.sites.forEach((site, i) => vectorsNearlyEqual(site.cart, sites[i].cart));
  });

  test("2x1x1 doubles along a", () => {
    const sc = makeSupercell(cs, [2, 1, 1]);

    console.log("cs", cs);

    cs.sites.forEach((s, i) => {
      console.log(i, s.cart);
    });

    console.log("sc", sc);

    sc.sites.forEach((s, i) => {
      console.log(i, s.cart);
    });

    expect(sc.sites.length).toBe(2 * sites.length);

    // check a translated copy exists
    const expectedShift = [1, 0, 0];

    const shifted = sites.map((s) => [
      s.cart[0] + expectedShift[0],
      s.cart[1] + expectedShift[1],
      s.cart[2] + expectedShift[2],
    ]);

    shifted.forEach((expected) => {
      const found = sc.sites.some((site) => {
        try {
          vectorsNearlyEqual(site.cart, expected as CartesianCoords);
          return true;
        } catch {
          return false;
        }
      });

      expect(found).toBe(true);
    });
  });

  test("2x2x2 produces 8x atoms", () => {
    const sc = makeSupercell(cs, [2, 2, 2]);

    expect(sc.sites.length).toBe(8 * sites.length);

    sc.lattice.forEach((v, i) =>
      vectorsNearlyEqual(v, lattice[i].map((x) => x * 2) as CartesianCoords),
    );
  });

  test("translations are correct (simple single atom case)", () => {
    const single = new CrystalStructure({
      lattice,
      species: ["X"],
      sites: [new Site(0, [0, 0, 0])],
    });

    const sc = makeSupercell(single, [2, 2, 1]);

    const expectedPositions: CartesianCoords[] = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ];

    expect(sc.sites.length).toBe(expectedPositions.length);

    expectedPositions.forEach((pos) => {
      const found = sc.sites.some((site) => {
        try {
          vectorsNearlyEqual(site.cart, pos);
          return true;
        } catch {
          return false;
        }
      });

      expect(found).toBe(true);
    });
  });

  test("throws on invalid dims", () => {
    expect(() => makeSupercell(cs, [0, 1, 1])).toThrow();
    expect(() => makeSupercell(cs, [-1, 1, 1])).toThrow();
    expect(() => makeSupercell(cs, [1.5, 1, 1])).toThrow();
  });
});
