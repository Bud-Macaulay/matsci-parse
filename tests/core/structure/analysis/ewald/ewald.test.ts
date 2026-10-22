import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { ewaldSum } from "@/core/structure/analysis/ewald/ewald";
import type { Structure } from "@/core/structure/structure";

import { csCl, naCl, srTiO3 } from "../../../../fixtures/structures";

function build(
  a: number[],
  species: string[],
  charges: number[],
  fracs: number[][],
): { s: Structure; q: number[] } {
  return {
    s: {
      lattice: createLattice(a),
      sites: fracs.map((f, i) => ({
        species: { symbol: species[i] },
        frac: new Float64Array(f),
      })),
    },
    q: charges,
  };
}

// B2 (CsCl-type) 2-atom cubes, a as given; references from pymatgen EwaldSummation.
const b2Na = build(
  [5.64, 0, 0, 0, 5.64, 0, 0, 0, 5.64],
  ["Na", "Cl"],
  [1, -1],
  [
    [0, 0, 0],
    [0.5, 0.5, 0.5],
  ],
);
const b2MgO = build(
  [4.21, 0, 0, 0, 4.21, 0, 0, 0, 4.21],
  ["Mg", "O"],
  [2, -2],
  [
    [0, 0, 0],
    [0.5, 0.5, 0.5],
  ],
);
// Catalog cells: pymatgen references with Na/Cs/Sr +, Cl -, Ti 4+, O 2-.
const b2Cs = { s: csCl, q: [1, -1] };
const rocksalt = { s: naCl, q: [1, 1, 1, 1, -1, -1, -1, -1] };
const perovskite = { s: srTiO3, q: [2, 4, -2, -2, -2] };

const charged = build(
  [5.64, 0, 0, 0, 5.64, 0, 0, 0, 5.64],
  ["Na", "Cl"],
  [1, -0.5],
  [
    [0, 0, 0],
    [0.5, 0.5, 0.5],
  ],
);
// Triclinic cells (Lattice.from_parameters matrices); references from
// pymatgen EwaldSummation (acc_factor=16).
// strongly skewed, neutral.
const triNeutral = build(
  [
    4.9692873304047, 0.0, -1.1472503771537115, -2.119698564834602,
    5.786293079438297, 1.3098436521518846, 0.0, 0.0, 7.2,
  ],
  ["Na", "Cl", "Mg", "O"],
  [1.0, -1.0, 2.0, -2.0],
  [
    [0.1, 0.2, 0.3],
    [0.6, 0.55, 0.8],
    [0.35, 0.9, 0.05],
    [0.85, 0.15, 0.6],
  ],
);
// net +1, a zero-charge site, fracs outside [0, 1).
const triCharged = build(
  [
    4.3832566716036805, 0.0, -0.38348526808969624, -2.8079987828503787,
    4.387812133674268, 2.7698822204367564, 0.0, 0.0, 8.3,
  ],
  ["Ca", "O", "Ar", "Li"],
  [2.0, -2.0, 0.0, 1.0],
  [
    [1.15, 0.3, -0.2],
    [0.4, -0.45, 0.7],
    [0.7, 0.85, 0.25],
    [0.05, 0.6, 1.55],
  ],
);
// fractional charges, net zero.
const triFractional = build(
  [
    6.058844364480901, 0.0, -3.0871353982289174, 3.5770834736311032,
    5.89915014725552, 0.12042160441725684, 0.0, 0.0, 5.2,
  ],
  ["Fe", "Fe", "O", "O", "O", "F"],
  [2.5, 2.5, -1.7, -1.7, -1.6, -0.0],
  [
    [0.0, 0.0, 0.0],
    [0.5, 0.5, 0.5],
    [0.23, 0.71, 0.12],
    [0.77, 0.29, 0.88],
    [0.41, 0.08, 0.66],
    [0.92, 0.47, 0.33],
  ],
);

describe("ewaldSum", () => {
  const parity: [
    string,
    { s: Structure; q: number[] },
    number,
    number,
    number,
    number,
  ][] = [
    // [label, system, total, real, reciprocal, point]
    [
      "B2 NaCl-type",
      b2Na,
      -5.1965397405,
      -0.3813548961,
      0.5947062712,
      -5.4098911156,
    ],
    [
      "B2 CsCl",
      b2Cs,
      -6.9632891748,
      -0.5110101246,
      0.7968979257,
      -7.249176976,
    ],
    [
      "B2 MgO",
      b2MgO,
      -27.8465407475,
      -2.0435549779,
      3.1868345552,
      -28.9898203248,
    ],
    [
      "rocksalt NaCl",
      rocksalt,
      -35.6940575834,
      -8.7797397596,
      0.3498249528,
      -27.2641427766,
    ],
    [
      "charged cell",
      charged,
      -3.5037680483,
      -0.1750472478,
      0.3367835246,
      -3.3811819472,
    ],
    [
      "SrTiO3",
      perovskite,
      -182.5671205203,
      -40.7754782806,
      3.8514554503,
      -145.64309769,
    ],
    [
      "triclinic neutral",
      triNeutral,
      -25.5355777661,
      -2.2387765827,
      5.6499806283,
      -28.9467818117,
    ],
    [
      "triclinic charged",
      triCharged,
      -55.5674368652,
      -26.7717107628,
      0.5531778121,
      -28.4104078275,
    ],
    [
      "triclinic fractional",
      triFractional,
      -104.1341273842,
      -39.4251828486,
      2.1964844105,
      -66.9054289461,
    ],
  ];
  for (const [label, sys, total, real, recip, point] of parity) {
    it(`${label} matches pymatgen components`, () => {
      const e = ewaldSum(sys.s, sys.q);
      expect(e.total).toBeCloseTo(total, 6);
      expect(e.real).toBeCloseTo(real, 6);
      expect(e.reciprocal).toBeCloseTo(recip, 6);
      expect(e.point).toBeCloseTo(point, 6);
    });
  }

  it("charged cell carries a background term, neutral cells do not", () => {
    expect(ewaldSum(b2Na.s, b2Na.q).chargedCell).toBeCloseTo(0, 12);
    const e = ewaldSum(charged.s, charged.q);
    expect(e.chargedCell).toBeLessThan(0);
    expect(e.total).toBeCloseTo(
      e.real + e.reciprocal + e.point + e.chargedCell,
      12,
    );
  });

  it("reproduces Madelung constants", () => {
    const conv = 14.399645468667815;
    // B1: E = -alpha * conv / r0 per NaCl pair, alpha = 1.7475645946331822.
    expect(ewaldSum(rocksalt.s, rocksalt.q).total / 4).toBeCloseTo(
      (-1.7475645946331822 * conv) / 2.82,
      6,
    );
    // B2: alpha = 1.762674773070991, r0 = sqrt(3) a / 2.
    expect(ewaldSum(b2Cs.s, b2Cs.q).total).toBeCloseTo(
      (-1.762674773070991 * conv) / ((Math.sqrt(3) * 4.209) / 2),
      6,
    );
  });

  it("is invariant to lattice-vector shifts of sites (unwrapped fracs)", () => {
    // Regression: unreduced pair offsets used to fall outside the image box.
    for (const accuracy of [12, 4]) {
      const ref = ewaldSum(rocksalt.s, rocksalt.q, { accuracy });
      for (const shift of [
        [3, 0, 0],
        [-2, 1, 0],
        [0, -1, 5],
      ]) {
        const shifted: Structure = {
          ...rocksalt.s,
          sites: rocksalt.s.sites.map((site, i) => ({
            ...site,
            frac:
              i % 2 === 0 ? site.frac.map((f, d) => f + shift[d]) : site.frac,
          })),
        };
        const e = ewaldSum(shifted, rocksalt.q, { accuracy });
        expect(e.real).toBeCloseTo(ref.real, 8);
        expect(e.reciprocal).toBeCloseTo(ref.reciprocal, 8);
        expect(e.total).toBeCloseTo(ref.total, 8);
      }
    }
  });

  it("validates inputs", () => {
    expect(() => ewaldSum(b2Na.s, [1])).toThrow(/charges/);
    expect(() => ewaldSum(b2Na.s, [1, Number.NaN])).toThrow(/finite/);
    expect(() => ewaldSum(b2Na.s, b2Na.q, { eta: -1 })).toThrow(/eta/);
  });

  it("accepts explicit eta and cutoffs", () => {
    const auto = ewaldSum(b2Na.s, b2Na.q);
    const manual = ewaldSum(b2Na.s, b2Na.q, {
      eta: 0.1108570534,
      realCutoff: 15,
      reciprocalCutoff: 4,
    });
    expect(manual.total).toBeCloseTo(auto.total, 6);
  });

  it("erfc backends agree with exact within their bounds", () => {
    const exact = ewaldSum(rocksalt.s, rocksalt.q, { erfc: "exact" });
    // Golden path is intact on the explicit-exact evaluator.
    expect(exact.total).toBeCloseTo(-35.6940575834, 6);
    const fast = ewaldSum(rocksalt.s, rocksalt.q, { erfc: "fast" });
    expect(fast.total).toBeCloseTo(exact.total, 9);
    // "auto" at default accuracy takes the fast path.
    expect(ewaldSum(rocksalt.s, rocksalt.q).total).toBe(fast.total);
    // Fast stays ~1e-13 even where cutoffs are coarse.
    const ref4 = ewaldSum(rocksalt.s, rocksalt.q, {
      accuracy: 4,
      erfc: "exact",
    });
    const fast4 = ewaldSum(rocksalt.s, rocksalt.q, {
      accuracy: 4,
      erfc: "fast",
    });
    expect(Math.abs((fast4.total - ref4.total) / ref4.total)).toBeLessThan(
      1e-9,
    );
    expect(ewaldSum(rocksalt.s, rocksalt.q, { accuracy: 4 }).total).toBe(
      fast4.total,
    );
    // Above accuracy 12 the table cannot keep up, so "auto" goes exact.
    expect(ewaldSum(rocksalt.s, rocksalt.q, { accuracy: 14 }).total).toBe(
      ewaldSum(rocksalt.s, rocksalt.q, { accuracy: 14, erfc: "exact" }).total,
    );
  });
});
