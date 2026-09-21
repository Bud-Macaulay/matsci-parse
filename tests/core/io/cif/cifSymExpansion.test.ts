import { describe, it } from "vitest";

import { fromCIF } from "@/core/io/cif";
import {
  assertStructuresMatch,
  ExpectedSite,
} from "../../../helpers/closeUtils";

import * as cifFixtures from "./teststrings/cif";

interface SymExpansionTestCase {
  name: string;
  cif: string;
  expected: {
    sites: ExpectedSite[];
    lattice?: number[];
  };
}

const testCases: SymExpansionTestCase[] = [
  {
    name: "P-1: FeN",
    cif: cifFixtures.sgn2Cif,
    expected: {
      // P-1 has 2 symops; Fe sits on an inversion centre (mult 1) while
      // each N is general (mult 2): 1 + 2 + 2 = 5 sites after expansion.
      // Fractional coordinates are wrapped to [0, 1).
      sites: [
        { species: "Fe", frac: [0.5, 0.0, 0.0] }, // centered
        { species: "N", frac: [0.163, 0.654, 0.515] },
        { species: "N", frac: [0.837, 0.346, 0.485] },
        { species: "N", frac: [0.065, 0.691, 0.139] },
        { species: "N", frac: [0.935, 0.309, 0.861] },
      ],
    },
  },

  // ── R-3m:H (IT #166) — LiCoO2 ───────────────────────────────
  // Li at (0, 0, 0.5) → 3 sites (Wyckoff 3b)
  // Co at (0, 0, 0)   → 3 sites (Wyckoff 3a)
  // O  at (0, 0, 0.257) → 6 sites (Wyckoff 6c)
  {
    name: "R-3m:H: LiCoO2",
    cif: cifFixtures.liCoO2Cif,
    expected: {
      lattice: [2.8503, 0, 0, -1.42515, 2.4686, 0, 0, 0, 14.139],
      sites: [
        //
        // Li (Wyckoff 3b): 3 sites
        { species: "Li", frac: [0, 0, 0.5] },
        { species: "Li", frac: [0.66667, 0.33333, 0.83333] },
        { species: "Li", frac: [0.33333, 0.66666, 0.16666] },
        // Co (Wyckoff 3a): 3 sites
        { species: "Co", frac: [0, 0, 0.0] },
        { species: "Co", frac: [0.66666, 0.33333, 0.33333] },
        { species: "Co", frac: [0.33333, 0.66666, 0.66666] },

        // O (Wyckoff 6c): 6 sites
        { species: "O", frac: [0, 0, 0.257] },
        { species: "O", frac: [0, 0, 0.743] },
        { species: "O", frac: [0.66666, 0.33333, 0.59033] },
        { species: "O", frac: [0.66666, 0.33333, 0.07633] },
        { species: "O", frac: [0.33333, 0.66666, 0.92366] },
        { species: "O", frac: [0.33333, 0.66666, 0.40966] },
      ],
    },
  },
];

describe("CIF symmetry expansion — site-by-site", () => {
  for (const tc of testCases) {
    it(tc.name, () => {
      const structure = fromCIF(tc.cif);

      assertStructuresMatch(structure, tc.expected);
    });
  }
});
