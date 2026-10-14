import { createLattice } from "@/core/lattice/lattice";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { splitSite } from "@/core/site/disorder";
import type { Structure } from "@/core/structure/structure";
import type { Site } from "@/core/site/site";

/** Primitive cubic cell with one disordered position. */
export function primCubic(a: number, occ: [string, number][]): Structure {
  return {
    lattice: createLattice([a, 0, 0, 0, a, 0, 0, 0, a]),
    sites: splitSite(
      [0, 0, 0],
      occ.map(([symbol, fraction]) => ({ symbol, fraction })),
    ),
  };
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
  naOcc: [string, number][] = [["Na", 1]],
  clOcc: [string, number][] = [["Cl", 1]],
): Structure {
  const split = (fracs: number[][], occ: [string, number][]): Site[] =>
    fracs.flatMap((f) =>
      splitSite(
        f,
        occ.map(([symbol, fraction]) => ({ symbol, fraction })),
      ),
    );
  return {
    lattice: createLattice([a, 0, 0, 0, a, 0, 0, 0, a]),
    sites: [...split(NA_FRACS, naOcc), ...split(CL_FRACS, clOcc)],
  };
}

export const diag = (x: number, y: number, z: number): Matrix =>
  createMatrix(3, 3, [x, 0, 0, 0, y, 0, 0, 0, z]);

export interface EnumCase {
  name: string;
  parent: Structure;
  H: Matrix;
  expectedCount: number;
  /** Exact sorted site-keys per structure (small cases only). */
  expectedKeys?: string[][];
  /** Expected species counts per output structure. */
  counts?: Record<string, number>;
}

const HALF: [string, number][] = [
  ["Ag", 0.5],
  ["Pd", 0.5],
];

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
];
