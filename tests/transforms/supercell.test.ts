import { CrystalStructure } from "../../lib/io/crystal";
import { Site, CartesianCoords } from "../../lib/io/common";
import { vectorsNearlyEqual } from "../helpers";

describe("CrystalStructure.applyLatticeTransformation", () => {
  const lattice: CartesianCoords[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const species = ["Na", "Cl"];
  const sites = [new Site(0, [0, 0, 0]), new Site(1, [0.5, 0.5, 0.5])];

  const cs = new CrystalStructure({ lattice, species, sites });

  test("uniform scaling", () => {
    const supercell = cs.applyLatticeTransformation(2);

    // lattice vectors doubled
    supercell.lattice.forEach((v, i) => {
      vectorsNearlyEqual(v, lattice[i].map((x) => x * 2) as CartesianCoords);
    });

    // sites scaled accordingly
    supercell.sites.forEach((site, i) => {
      vectorsNearlyEqual(
        site.cart,
        sites[i].cart.map((x) => x * 2) as CartesianCoords,
      );
    });
  });

  test("diagonal scaling", () => {
    const supercell = cs.applyLatticeTransformation([2, 3, 4]);

    const expectedLattice = [
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 4],
    ];
    supercell.lattice.forEach((v, i) => {
      vectorsNearlyEqual(v, expectedLattice[i] as CartesianCoords);
    });

    const expectedSites = [
      [0, 0, 0],
      [1, 1.5, 2], // original [0.5,0.5,0.5] scaled
    ];
    supercell.sites.forEach((site, i) => {
      vectorsNearlyEqual(site.cart, expectedSites[i] as CartesianCoords);
    });
  });

  test("full 3x3 matrix scaling", () => {
    const matrix = [
      [1, 1, 0],
      [0, 1, 1],
      [1, 0, 1],
    ];
    const supercell = cs.applyLatticeTransformation(matrix);

    const expectedLattice = lattice.map(
      (vec) =>
        [
          vec[0] * matrix[0][0] + vec[1] * matrix[0][1] + vec[2] * matrix[0][2],
          vec[0] * matrix[1][0] + vec[1] * matrix[1][1] + vec[2] * matrix[1][2],
          vec[0] * matrix[2][0] + vec[1] * matrix[2][1] + vec[2] * matrix[2][2],
        ] as CartesianCoords,
    );

    supercell.lattice.forEach((v, i) =>
      vectorsNearlyEqual(v, expectedLattice[i]),
    );

    const expectedSites = sites.map(
      (site) =>
        [
          site.cart[0] * matrix[0][0] +
            site.cart[1] * matrix[0][1] +
            site.cart[2] * matrix[0][2],
          site.cart[0] * matrix[1][0] +
            site.cart[1] * matrix[1][1] +
            site.cart[2] * matrix[1][2],
          site.cart[0] * matrix[2][0] +
            site.cart[1] * matrix[2][1] +
            site.cart[2] * matrix[2][2],
        ] as CartesianCoords,
    );

    supercell.sites.forEach((site, i) =>
      vectorsNearlyEqual(site.cart, expectedSites[i]),
    );
  });

  test("supercell with negative scaling (inversion)", () => {
    const cs = new CrystalStructure({
      lattice: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      species: ["A", "B"],
      sites: [new Site(0, [0.1, 0.2, 0.3]), new Site(1, [0.4, 0.5, 0.6])],
    });

    const supercell = cs.applyLatticeTransformation([-1, 2, -0.5]);
    const expectedLattice: CartesianCoords[] = [
      [-1, 0, 0],
      [0, 2, 0],
      [0, 0, -0.5],
    ];
    supercell.lattice.forEach((v, i) =>
      vectorsNearlyEqual(v, expectedLattice[i]),
    );

    const expectedSites: CartesianCoords[] = [
      [-0.1, 0.4, -0.15],
      [-0.4, 1.0, -0.3],
    ];
    supercell.sites.forEach((site, i) =>
      vectorsNearlyEqual(site.cart, expectedSites[i]),
    );
  });
});
