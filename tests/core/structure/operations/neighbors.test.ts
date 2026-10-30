import { describe, it, expect } from "vitest";
import {
  getNeighbors,
  getNeighborList,
  getCoordinationNumbers,
} from "@/core/structure/operations/neighbors";
import type { Structure } from "@/core/structure/structure";
import { createLattice } from "@/core/lattice/lattice";

import {
  csCl,
  cuFCC,
  graphite,
  h2oBox,
  siDiamond,
  znOWurtzite,
} from "../../../fixtures/structures";

/** An expected neighbor: site index, image and distance (Å, 4 decimals). */
type Expected = [number, [number, number, number], number];

/** The Neighbor objects expected in `structure`. */
const neighbors = (structure: Structure, expected: Expected[]) =>
  expected.map(([index, image, distance]) => ({
    index,
    symbol: structure.sites[index].species.symbol,
    distance: expect.closeTo(distance, 4),
    image,
  }));

const site = (symbol: string, frac: number[]) => ({
  species: { symbol },
  frac: new Float64Array(frac),
});

const cubic = (a: number) => createLattice([a, 0, 0, 0, a, 0, 0, 0, a]);

// The default neighbor lists (covalent radii + 0.3 Å skin) as [index, image,
// distance], in list order.
// prettier-ignore
const FIXTURES: [string, Structure, Expected[][]][] = [
  [
    // a = 4.209: 8 Cl corners at a√3/2 and, for Cs only, 6 Cs self-images at a
    "CsCl",
    csCl,
    [
      [
        [0, [-1, 0, 0], 4.209], [0, [0, -1, 0], 4.209], [0, [0, 0, -1], 4.209], [0, [0, 0, 1], 4.209],
        [0, [0, 1, 0], 4.209], [0, [1, 0, 0], 4.209], [1, [-1, -1, -1], 3.6451], [1, [-1, -1, 0], 3.6451],
        [1, [-1, 0, -1], 3.6451], [1, [-1, 0, 0], 3.6451], [1, [0, -1, -1], 3.6451], [1, [0, -1, 0], 3.6451],
        [1, [0, 0, -1], 3.6451], [1, [0, 0, 0], 3.6451],
      ],
      [
        [0, [0, 0, 0], 3.6451], [0, [0, 0, 1], 3.6451], [0, [0, 1, 0], 3.6451], [0, [0, 1, 1], 3.6451],
        [0, [1, 0, 0], 3.6451], [0, [1, 0, 1], 3.6451], [0, [1, 1, 0], 3.6451], [0, [1, 1, 1], 3.6451],
      ],
    ],
  ],
  [
    "fcc Cu",
    cuFCC,
    [
      [
        [1, [-1, -1, 0], 2.5562], [1, [-1, 0, 0], 2.5562], [1, [0, -1, 0], 2.5562], [1, [0, 0, 0], 2.5562],
        [2, [-1, 0, -1], 2.5562], [2, [-1, 0, 0], 2.5562], [2, [0, 0, -1], 2.5562], [2, [0, 0, 0], 2.5562],
        [3, [0, -1, -1], 2.5562], [3, [0, -1, 0], 2.5562], [3, [0, 0, -1], 2.5562], [3, [0, 0, 0], 2.5562],
      ],
      [
        [0, [0, 0, 0], 2.5562], [0, [0, 1, 0], 2.5562], [0, [1, 0, 0], 2.5562], [0, [1, 1, 0], 2.5562],
        [2, [0, 0, -1], 2.5562], [2, [0, 0, 0], 2.5562], [2, [0, 1, -1], 2.5562], [2, [0, 1, 0], 2.5562],
        [3, [0, 0, -1], 2.5562], [3, [0, 0, 0], 2.5562], [3, [1, 0, -1], 2.5562], [3, [1, 0, 0], 2.5562],
      ],
      [
        [0, [0, 0, 0], 2.5562], [0, [0, 0, 1], 2.5562], [0, [1, 0, 0], 2.5562], [0, [1, 0, 1], 2.5562],
        [1, [0, -1, 0], 2.5562], [1, [0, -1, 1], 2.5562], [1, [0, 0, 0], 2.5562], [1, [0, 0, 1], 2.5562],
        [3, [0, -1, 0], 2.5562], [3, [0, 0, 0], 2.5562], [3, [1, -1, 0], 2.5562], [3, [1, 0, 0], 2.5562],
      ],
      [
        [0, [0, 0, 0], 2.5562], [0, [0, 0, 1], 2.5562], [0, [0, 1, 0], 2.5562], [0, [0, 1, 1], 2.5562],
        [1, [-1, 0, 0], 2.5562], [1, [-1, 0, 1], 2.5562], [1, [0, 0, 0], 2.5562], [1, [0, 0, 1], 2.5562],
        [2, [-1, 0, 0], 2.5562], [2, [-1, 1, 0], 2.5562], [2, [0, 0, 0], 2.5562], [2, [0, 1, 0], 2.5562],
      ],
    ],
  ],
  [
    "diamond Si",
    siDiamond,
    [
      [[4, [0, 0, 0], 2.3517], [5, [-1, -1, 0], 2.3517], [6, [-1, 0, -1], 2.3517], [7, [0, -1, -1], 2.3517]],
      [[4, [0, 0, 0], 2.3517], [5, [0, 0, 0], 2.3517], [6, [0, 0, -1], 2.3517], [7, [0, 0, -1], 2.3517]],
      [[4, [0, 0, 0], 2.3517], [5, [0, -1, 0], 2.3517], [6, [0, 0, 0], 2.3517], [7, [0, -1, 0], 2.3517]],
      [[4, [0, 0, 0], 2.3517], [5, [-1, 0, 0], 2.3517], [6, [-1, 0, 0], 2.3517], [7, [0, 0, 0], 2.3517]],
      [[0, [0, 0, 0], 2.3517], [1, [0, 0, 0], 2.3517], [2, [0, 0, 0], 2.3517], [3, [0, 0, 0], 2.3517]],
      [[0, [1, 1, 0], 2.3517], [1, [0, 0, 0], 2.3517], [2, [0, 1, 0], 2.3517], [3, [1, 0, 0], 2.3517]],
      [[0, [1, 0, 1], 2.3517], [1, [0, 0, 1], 2.3517], [2, [0, 0, 0], 2.3517], [3, [1, 0, 0], 2.3517]],
      [[0, [0, 1, 1], 2.3517], [1, [0, 0, 1], 2.3517], [2, [0, 1, 0], 2.3517], [3, [0, 0, 0], 2.3517]],
    ],
  ],
  [
    // One axial Zn-O bond (1.9891) and three basal ones (1.9744)
    "wurtzite ZnO",
    znOWurtzite,
    [
      [[2, [0, 0, 0], 1.9891], [3, [-1, 0, -1], 1.9744], [3, [0, 0, -1], 1.9744], [3, [0, 1, -1], 1.9744]],
      [[2, [0, -1, 0], 1.9744], [2, [0, 0, 0], 1.9744], [2, [1, 0, 0], 1.9744], [3, [0, 0, 0], 1.9891]],
      [[0, [0, 0, 0], 1.9891], [1, [-1, 0, 0], 1.9744], [1, [0, 0, 0], 1.9744], [1, [0, 1, 0], 1.9744]],
      [[0, [0, -1, 1], 1.9744], [0, [0, 0, 1], 1.9744], [0, [1, 0, 1], 1.9744], [1, [0, 0, 0], 1.9891]],
    ],
  ],
  [
    // In-plane bonds only: the layers are 3.35 Å apart
    "graphite",
    graphite,
    [
      [[2, [-1, -1, 0], 1.4261], [2, [0, -1, 0], 1.4261], [2, [0, 0, 0], 1.4261]],
      [[3, [-1, -1, 0], 1.4261], [3, [-1, 0, 0], 1.4261], [3, [0, 0, 0], 1.4261]],
      [[0, [0, 0, 0], 1.4261], [0, [0, 1, 0], 1.4261], [0, [1, 1, 0], 1.4261]],
      [[1, [0, 0, 0], 1.4261], [1, [1, 0, 0], 1.4261], [1, [1, 1, 0], 1.4261]],
    ],
  ],
  [
    "H2O in vacuum",
    h2oBox,
    [
      [[1, [0, 0, 0], 0.9572], [2, [0, 0, 0], 0.9572]],
      [[0, [0, 0, 0], 0.9572]],
      [[0, [0, 0, 0], 0.9572]],
    ],
  ],
];

describe("neighbors of the fixtures", () => {
  it.each(FIXTURES)("getNeighborList for %s", (_, st, expected) => {
    expect(getNeighborList(st)).toEqual(expected.map((e) => neighbors(st, e)));
  });

  it.each(FIXTURES)(
    "getNeighbors for %s, sorted by distance",
    (_, st, expected) => {
      st.sites.forEach((_, i) => {
        const distances = getNeighbors(st, i).map((n) => n.distance);

        expect(distances).toEqual([...distances].sort((a, b) => a - b));
        expect(distances).toEqual(
          expected[i]
            .map(([, , d]) => d)
            .sort((a, b) => a - b)
            .map((d) => expect.closeTo(d, 4)),
        );
      });
      expect(getCoordinationNumbers(st)).toEqual(expected.map((e) => e.length));
    },
  );
});

describe("neighbors edge cases", () => {
  it("finds images in highly skewed cells", () => {
    // a=(10,0,0), b=(9.95,0.2,0): image (2,-2,0) sits ~0.5 away.
    // Vector-length bounds (ceil(cutoff/10) = 1) would miss it.
    const skew = {
      lattice: createLattice([10, 0, 0, 9.95, 0.2, 0, 0, 0, 5]),
      sites: [site("Cs", [0, 0, 0]), site("Cl", [0.01, 0.01, 0])],
    };
    const far = getNeighbors(skew, 0).find(
      (x) => x.index === 1 && x.image.join(",") === "2,-2,0",
    );

    expect(far?.distance).toBeCloseTo(0.498, 2);
    expect(getNeighborList(skew)[0]).toContainEqual({
      ...far,
      image: [2, -2, 0],
    });
  });

  it("labels images from the stored fracs, also outside [0, 1)", () => {
    // H at x = 19.8 Å and x = -0.5 Å are 0.3 Å apart two cells over;
    // getNeighbors labels relative to the wrapped offset instead.
    const st = {
      lattice: cubic(10),
      sites: [site("H", [1.98, 0, 0]), site("H", [-0.05, 0, 0])],
    };

    expect(getNeighborList(st, { cutoff: 1 })).toEqual([
      neighbors(st, [[1, [2, 0, 0], 0.3]]),
      neighbors(st, [[0, [-2, 0, 0], 0.3]]),
    ]);
    expect(getNeighbors(st, 0, { cutoff: 1 })[0].image).toEqual([0, 0, 0]);
  });

  it("moves labels, not neighbors, under lattice translations", () => {
    const shifted = {
      ...znOWurtzite,
      sites: znOWurtzite.sites.map((s, i) => ({
        ...s,
        frac: s.frac.map(
          (x, d) =>
            x +
            [
              [1, 0, -2],
              [0, 0, 0],
              [-3, 2, 1],
              [0, 1, 0],
            ][i][d],
        ),
      })),
    };

    // image - n_j + n_i: site 0 moved by (1,0,-2), site 2 by (-3,2,1), site 3 by (0,1,0)
    expect(getNeighborList(shifted)[0]).toEqual(
      neighbors(shifted, [
        [2, [4, -2, -3], 1.9891],
        [3, [0, -1, -3], 1.9744],
        [3, [1, -1, -3], 1.9744],
        [3, [1, 0, -3], 1.9744],
      ]),
    );
  });

  it("excludes pairs exactly at the cutoff", () => {
    const single = { lattice: cubic(4), sites: [site("Cs", [0, 0, 0])] };

    expect(getNeighborList(single, { cutoff: 4 })).toEqual([[]]);
    expect(getNeighbors(single, 0, { cutoff: 4 })).toEqual([]);
    expect(getNeighborList(single, { cutoff: 4.001 })[0]).toHaveLength(6);
  });

  it("takes a global cutoff or one per pair of sites", () => {
    // 4 Å keeps the 8 Cl corners (3.645) but drops the Cs self-images (4.209)
    expect(getCoordinationNumbers(csCl, { cutoff: 4 })).toEqual([8, 8]);
    expect(getNeighbors(csCl, 0, { cutoff: 3 })).toEqual([]);
    // Only Cs-Cl pairs
    expect(
      getNeighborList(csCl, {
        cutoff: (i, j) => (i === j ? undefined : 5),
      }).map((ns) => ns.length),
    ).toEqual([8, 8]);
  });

  it("skips unknown radii unless a cutoff is given; reads isotopes", () => {
    const bk = {
      lattice: csCl.lattice,
      sites: [site("Bk", [0, 0, 0]), site("Cl", [0.5, 0.5, 0.5])],
    };
    const d2 = {
      lattice: cubic(10),
      sites: [site("D", [0, 0, 0]), site("D", [0.07, 0, 0])],
    };

    expect(getNeighbors(bk, 0)).toEqual([]);
    expect(getNeighborList(bk)[0]).toEqual([]);
    expect(getNeighbors(bk, 0, { cutoff: 4 })).toHaveLength(8);
    expect(getNeighborList(d2)).toEqual([
      neighbors(d2, [[1, [0, 0, 0], 0.7]]),
      neighbors(d2, [[0, [0, 0, 0], 0.7]]),
    ]);
  });

  it("finds a site on the cell boundary at zero distance", () => {
    // frac 1.0 == frac 0.0
    const st = {
      lattice: cubic(10),
      sites: [site("H", [0, 0, 0]), site("H", [1, 0, 0])],
    };

    expect(getNeighbors(st, 0)[0]).toMatchObject({
      distance: 0,
      image: [0, 0, 0],
    });
    expect(getNeighborList(st)[0]).toEqual(neighbors(st, [[1, [-1, 0, 0], 0]]));
  });

  it("returns no neighbors for an invalid cutoff or skin", () => {
    for (const options of [
      { cutoff: 0 },
      { cutoff: Infinity },
      { skin: NaN },
    ]) {
      expect(getNeighbors(csCl, 0, options)).toEqual([]);
      expect(getNeighborList(csCl, options)).toEqual([[], []]);
    }
    expect(getNeighborList(csCl, { cutoff: () => -1 })).toEqual([[], []]);
    expect(getNeighborList(csCl, { cutoff: () => NaN })).toEqual([[], []]);
  });

  it("rejects an invalid site index", () => {
    for (const idx of [-1, 2, 0.5, NaN]) {
      expect(() => getNeighbors(csCl, idx)).toThrow(RangeError);
    }
  });
});
