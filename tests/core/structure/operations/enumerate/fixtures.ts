import { createLattice } from "@/core/lattice/lattice";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { createDisorderedSite } from "@/core/site/disorder";
import type { DisorderedStructure } from "@/core/structure/disordered";

type Occ = [string, number][];

const site = (frac: number[], occ: Occ) =>
  createDisorderedSite(
    frac,
    occ.map(([symbol, fraction]) => ({ symbol, fraction })),
  );

/** One disordered position at `frac` in an arbitrary lattice. */
export function single(
  basis: number[],
  occ: Occ,
  frac: number[] = [0, 0, 0],
): DisorderedStructure {
  return {
    disordered: true,
    lattice: createLattice(basis),
    sites: [site(frac, occ)],
  };
}

/** Primitive cubic cell with one disordered position. */
export function primCubic(a: number, occ: Occ): DisorderedStructure {
  return single([a, 0, 0, 0, a, 0, 0, 0, a], occ);
}

const NA_FRACS = [
  [0, 0, 0],
  [0.5, 0.5, 0],
  [0.5, 0, 0.5],
  [0, 0.5, 0.5],
];
const CL_FRACS = [
  [0.5, 0.5, 0.5],
  [0, 0, 0.5],
  [0, 0.5, 0],
  [0.5, 0, 0],
];

/** Rocksalt conventional cell with independent disorder on each sublattice. */
export function rocksalt(
  a: number,
  naOcc: Occ = [["Na", 1]],
  clOcc: Occ = [["Cl", 1]],
): DisorderedStructure {
  return {
    disordered: true,
    lattice: createLattice([a, 0, 0, 0, a, 0, 0, 0, a]),
    sites: [
      ...NA_FRACS.map((f) => site(f, naOcc)),
      ...CL_FRACS.map((f) => site(f, clOcc)),
    ],
  };
}

export const diag = (x: number, y: number, z: number): Matrix =>
  createMatrix(3, 3, [x, 0, 0, 0, y, 0, 0, 0, z]);

export interface EnumCase {
  name: string;
  parent: DisorderedStructure;
  H: Matrix;
  expectedCount: number;
  /** Exact sorted site-keys per structure (small cases only). */
  expectedKeys?: string[][];
  /** Expected species counts per output structure. */
  counts?: Record<string, number>;
}

const HALF: Occ = [
  ["Ag", 0.5],
  ["Pd", 0.5],
];

const HEX = [
  3,
  0,
  0,
  -3 * Math.cos(Math.PI / 3),
  3 * Math.sin(Math.PI / 3),
  0,
  0,
  0,
  5,
];
const FCC = [0, 1.5, 1.5, 1.5, 0, 1.5, 1.5, 1.5, 0];
const TRICLINIC = [3, 0, 0, 0.4, 3.2, 0, 0.3, 0.5, 3.7];

export const enumCases: EnumCase[] = [
  {
    name: "A: 2-site binary",
    parent: primCubic(3, HALF),
    H: diag(2, 1, 1),
    expectedCount: 1,
    expectedKeys: [["Ag:0,0,0", "Pd:0.5,0,0"]],
    counts: { Ag: 1, Pd: 1 },
  },
  {
    name: "B: 4-site binary 2/2",
    parent: primCubic(3, HALF),
    H: diag(2, 2, 1),
    expectedCount: 2,
    expectedKeys: [
      ["Ag:0,0,0", "Ag:0,0.5,0", "Pd:0.5,0,0", "Pd:0.5,0.5,0"],
      ["Ag:0,0,0", "Ag:0.5,0.5,0", "Pd:0,0.5,0", "Pd:0.5,0,0"],
    ],
    counts: { Ag: 2, Pd: 2 },
  },
  {
    name: "C: rocksalt Cl/Br",
    parent: rocksalt(
      5.64,
      [["Na", 1]],
      [
        ["Cl", 0.5],
        ["Br", 0.5],
      ],
    ),
    H: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    expectedCount: 1,
    expectedKeys: [
      [
        "Na:0,0,0",
        "Na:0,0.5,0.5",
        "Na:0.5,0,0.5",
        "Na:0.5,0.5,0",
        "Br:0,0,0.5",
        "Br:0.5,0.5,0.5",
        "Cl:0,0.5,0",
        "Cl:0.5,0,0",
      ],
    ],
    counts: { Na: 4, Cl: 2, Br: 2 },
  },
  {
    name: "D: doubled rocksalt Cl/Br",
    parent: rocksalt(
      5.64,
      [["Na", 1]],
      [
        ["Cl", 0.5],
        ["Br", 0.5],
      ],
    ),
    H: diag(2, 1, 1),
    expectedCount: 8,
    counts: { Na: 8, Cl: 4, Br: 4 },
  },
  {
    name: "E: ternary thirds",
    parent: primCubic(3, [
      ["A", 1 / 3],
      ["B", 1 / 3],
      ["C", 1 / 3],
    ]),
    H: diag(3, 1, 1),
    expectedCount: 1,
    expectedKeys: [["A:0,0,0", "B:0.333333,0,0", "C:0.666667,0,0"]],
    counts: { A: 1, B: 1, C: 1 },
  },
  {
    name: "F: sheared binary",
    parent: primCubic(3, HALF),
    H: createMatrix(3, 3, [1, 1, 0, -1, 1, 0, 0, 0, 1]),
    expectedCount: 1,
    expectedKeys: [["Ag:0,0,0", "Pd:0.5,0.5,0"]],
    counts: { Ag: 1, Pd: 1 },
  },
  {
    name: "G: sheared binary 2/2",
    parent: primCubic(3, HALF),
    H: createMatrix(3, 3, [2, 1, 0, 0, 2, 0, 0, 0, 1]),
    expectedCount: 2,
    expectedKeys: [
      ["Ag:0,0,0", "Ag:0,0.5,0", "Pd:0.5,0.25,0", "Pd:0.5,0.75,0"],
      ["Ag:0,0,0", "Ag:0.5,0.25,0", "Pd:0,0.5,0", "Pd:0.5,0.75,0"],
    ],
    counts: { Ag: 2, Pd: 2 },
  },
  {
    name: "H: dual-sublattice disorder",
    parent: rocksalt(
      5.64,
      [
        ["Na", 0.5],
        ["K", 0.5],
      ],
      [
        ["Cl", 0.5],
        ["Br", 0.5],
      ],
    ),
    H: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    expectedCount: 3,
    counts: { Na: 2, K: 2, Cl: 2, Br: 2 },
  },
  {
    name: "I: tripled rocksalt Cl/Br",
    parent: rocksalt(
      5.64,
      [["Na", 1]],
      [
        ["Cl", 0.5],
        ["Br", 0.5],
      ],
    ),
    H: diag(3, 1, 1),
    expectedCount: 34,
    counts: { Na: 12, Cl: 6, Br: 6 },
  },
  // Cases below were cross-checked against a brute-force reference (every
  // labeling deduplicated with pymatgen's StructureMatcher).
  {
    name: "J: hexagonal non-diagonal H",
    parent: single(HEX, HALF),
    H: createMatrix(3, 3, [2, 1, 0, 0, 1, 0, 0, 0, 2]),
    expectedCount: 3,
    counts: { Ag: 2, Pd: 2 },
  },
  {
    name: "K: primitive fcc 2x2x2, 1/4 - 3/4",
    parent: single(FCC, [
      ["Ag", 0.25],
      ["Pd", 0.75],
    ]),
    H: diag(2, 2, 2),
    expectedCount: 2,
    counts: { Ag: 2, Pd: 6 },
  },
  {
    name: "L: primitive fcc non-diagonal H",
    parent: single(FCC, HALF),
    H: createMatrix(3, 3, [1, 1, 0, -1, 1, 0, 0, 0, 2]),
    expectedCount: 2,
    counts: { Ag: 2, Pd: 2 },
  },
  {
    name: "M: rocksalt 2x1x1 Cl/Br 1/4 - 3/4",
    parent: rocksalt(
      5.64,
      [["Na", 1]],
      [
        ["Cl", 0.25],
        ["Br", 0.75],
      ],
    ),
    H: diag(2, 1, 1),
    expectedCount: 4,
    counts: { Na: 8, Cl: 2, Br: 6 },
  },
  {
    name: "N: triclinic 4x1x1",
    parent: single(TRICLINIC, HALF, [0.1, 0.2, 0.3]),
    H: diag(4, 1, 1),
    expectedCount: 2,
    counts: { Ag: 2, Pd: 2 },
  },
  // Large cases near the search-space cap (counts observed from this
  // implementation; validated by per-structure composition, frac bounds,
  // and pairwise distinctness in orderDisordered.test.ts).
  {
    name: "O: doubled dual-sublattice",
    parent: rocksalt(
      5.64,
      [
        ["Na", 0.5],
        ["K", 0.5],
      ],
      [
        ["Cl", 0.5],
        ["Br", 0.5],
      ],
    ),
    H: diag(2, 1, 1),
    expectedCount: 202,
    counts: { Na: 4, K: 4, Cl: 4, Br: 4 },
  },
  {
    name: "P: quadrupled rocksalt Cl/Br 1/4 - 3/4",
    parent: rocksalt(
      5.64,
      [["Na", 1]],
      [
        ["Cl", 0.25],
        ["Br", 0.75],
      ],
    ),
    H: diag(4, 1, 1),
    expectedCount: 51,
    counts: { Na: 16, Cl: 4, Br: 12 },
  },
];
