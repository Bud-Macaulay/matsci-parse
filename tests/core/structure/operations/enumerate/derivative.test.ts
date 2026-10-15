import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { createDisorderedSite } from "@/core/site/disorder";
import { determinant } from "@/core/matrix/operations/determinant";
import type { DisorderedStructure } from "@/core/structure/disordered";
import { enumerateDerivativeStructures } from "@/core/structure/operations/enumerate/orderDisordered";

type Occ = Record<string, number>;

function parent(
  basis: number[],
  sites: [number[], Occ][],
): DisorderedStructure {
  return {
    disordered: true,
    lattice: createLattice(basis),
    sites: sites.map(([frac, occ]) => createDisorderedSite(frac, occ)),
  };
}

const FCC = [0, 2, 2, 2, 0, 2, 2, 2, 0];
const BCC = [-1.5, 1.5, 1.5, 1.5, -1.5, 1.5, 1.5, 1.5, -1.5];
const SC = [3, 0, 0, 0, 3, 0, 0, 0, 3];
const HCP = [3, 0, 0, -1.5, 1.5 * Math.sqrt(3), 0, 0, 0, 4.9];
const HALF: Occ = { Ag: 0.5, Pd: 0.5 };
const THIRD: Occ = { Ag: 1 / 3, Pd: 1 / 3, Pt: 1 / 3 };

// Expected counts from enumlib (enum.x via pymatgen's
// EnumerateStructureTransformation, min = max cell size), primitive parents.
const cases: [string, DisorderedStructure, number, number][] = [
  ["fcc 1/2", parent(FCC, [[[0, 0, 0], HALF]]), 2, 2],
  ["fcc 1/2", parent(FCC, [[[0, 0, 0], HALF]]), 4, 5],
  ["fcc 1/2", parent(FCC, [[[0, 0, 0], HALF]]), 6, 20],
  ["fcc 1/4", parent(FCC, [[[0, 0, 0], { Ag: 0.25, Pd: 0.75 }]]), 4, 7],
  ["fcc 1/4", parent(FCC, [[[0, 0, 0], { Ag: 0.25, Pd: 0.75 }]]), 8, 42],
  [
    "fcc ternary 1/3",
    parent(FCC, [[[0, 0, 0], { Ag: 1 / 3, Pd: 1 / 3, Pt: 1 / 3 }]]),
    3,
    3,
  ],
  [
    "fcc ternary 1/3",
    parent(FCC, [[[0, 0, 0], { Ag: 1 / 3, Pd: 1 / 3, Pt: 1 / 3 }]]),
    6,
    100,
  ],
  ["bcc 1/2", parent(BCC, [[[0, 0, 0], HALF]]), 2, 2],
  ["bcc 1/2", parent(BCC, [[[0, 0, 0], HALF]]), 4, 5],
  ["bcc 1/2", parent(BCC, [[[0, 0, 0], HALF]]), 6, 20],
  ["sc 1/2", parent(SC, [[[0, 0, 0], HALF]]), 2, 3],
  ["sc 1/2", parent(SC, [[[0, 0, 0], HALF]]), 4, 6],
  [
    "hcp 1/2 (2-site cell)",
    parent(HCP, [
      [[1 / 3, 2 / 3, 0.25], HALF],
      [[2 / 3, 1 / 3, 0.75], HALF],
    ]),
    1,
    1,
  ],
  [
    "hcp 1/2 (2-site cell)",
    parent(HCP, [
      [[1 / 3, 2 / 3, 0.25], HALF],
      [[2 / 3, 1 / 3, 0.75], HALF],
    ]),
    2,
    4,
  ],
  [
    "hcp 1/2 (2-site cell)",
    parent(HCP, [
      [[1 / 3, 2 / 3, 0.25], HALF],
      [[2 / 3, 1 / 3, 0.75], HALF],
    ]),
    3,
    10,
  ],
  [
    "rocksalt, anion 1/2",
    parent(FCC, [
      [[0, 0, 0], { Na: 1 }],
      [[0.5, 0.5, 0.5], { Cl: 0.5, Br: 0.5 }],
    ]),
    2,
    2,
  ],
  [
    "rocksalt, anion 1/2",
    parent(FCC, [
      [[0, 0, 0], { Na: 1 }],
      [[0.5, 0.5, 0.5], { Cl: 0.5, Br: 0.5 }],
    ]),
    4,
    5,
  ],
  // Larger sizes, still cheap enough for the unit suite (same enumlib source).
  [
    "fcc ternary 1/3",
    parent(FCC, [[[0, 0, 0], { Ag: 1 / 3, Pd: 1 / 3, Pt: 1 / 3 }]]),
    9,
    1061,
  ],
  ["bcc ternary 1/3", parent(BCC, [[[0, 0, 0], THIRD]]), 3, 3],
  ["bcc ternary 1/3", parent(BCC, [[[0, 0, 0], THIRD]]), 6, 100],
  ["bcc ternary 1/3", parent(BCC, [[[0, 0, 0], THIRD]]), 9, 1061],
  ["bcc 1/2", parent(BCC, [[[0, 0, 0], HALF]]), 8, 94],
  ["sc 1/2", parent(SC, [[[0, 0, 0], HALF]]), 8, 119],
  [
    "hcp 1/2 (2-site cell)",
    parent(HCP, [
      [[1 / 3, 2 / 3, 0.25], HALF],
      [[2 / 3, 1 / 3, 0.75], HALF],
    ]),
    4,
    68,
  ],
  [
    "rocksalt, anion 1/2",
    parent(FCC, [
      [[0, 0, 0], { Na: 1 }],
      [[0.5, 0.5, 0.5], { Cl: 0.5, Br: 0.5 }],
    ]),
    8,
    94,
  ],
];

describe("enumerateDerivativeStructures", () => {
  for (const [name, p, size, expected] of cases) {
    it(`${name}, size ${size}: ${expected} structures (enumlib)`, async () => {
      const out = await enumerateDerivativeStructures(p, {
        minSize: size,
        maxSize: size,
        maxCombinations: 1_000_000, // the cap has its own test below
      });
      expect(out).toHaveLength(expected);
      // Every structure is a size-fold supercell of the parent.
      const v0 = Math.abs(determinant(p.lattice.basis));
      for (const s of out) {
        expect(Math.abs(determinant(s.lattice.basis)) / v0).toBeCloseTo(
          size,
          9,
        );
      }
    });
  }

  it("a size range is the union of the single sizes", async () => {
    const p = parent(FCC, [[[0, 0, 0], HALF]]);
    const range = await enumerateDerivativeStructures(p, {
      minSize: 1,
      maxSize: 4,
    });
    // Size 1 and 3 cannot hold a 1/2 composition: 2 + 5 structures.
    expect(range).toHaveLength(7);
  });

  it("validates sizes and enforces the search cap", async () => {
    const p = parent(FCC, [[[0, 0, 0], HALF]]);
    await expect(
      enumerateDerivativeStructures(p, { minSize: 3, maxSize: 2 }),
    ).rejects.toThrow(/minSize/);
    await expect(
      enumerateDerivativeStructures(p, { maxSize: 0 }),
    ).rejects.toThrow(/minSize/);
    await expect(
      enumerateDerivativeStructures(p, { maxSize: 6, maxCombinations: 50 }),
    ).rejects.toThrow(/exceeds cap/);
  });
});
