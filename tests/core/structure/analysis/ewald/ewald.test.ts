import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { ewaldSum } from "@/core/structure/analysis/ewald/ewald";
import type { Structure } from "@/core/structure/structure";

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
const b2Cs = build(
  [4.12, 0, 0, 0, 4.12, 0, 0, 0, 4.12],
  ["Cs", "Cl"],
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
// True rocksalt conventional cell (8 atoms, 4 formula units).
const rocksalt = build(
  [5.64, 0, 0, 0, 5.64, 0, 0, 0, 5.64],
  ["Na", "Na", "Na", "Na", "Cl", "Cl", "Cl", "Cl"],
  [1, 1, 1, 1, -1, -1, -1, -1],
  [
    [0, 0, 0],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
    [0.5, 0.5, 0.5],
    [0, 0, 0.5],
    [0, 0.5, 0],
    [0.5, 0, 0],
  ],
);
const charged = build(
  [5.64, 0, 0, 0, 5.64, 0, 0, 0, 5.64],
  ["Na", "Cl"],
  [1, -0.5],
  [
    [0, 0, 0],
    [0.5, 0.5, 0.5],
  ],
);
const perovskite = build(
  [3.905, 0, 0, 0, 3.905, 0, 0, 0, 3.905],
  ["Sr", "Ti", "O", "O", "O"],
  [2, 4, -2, -2, -2],
  [
    [0, 0, 0],
    [0.5, 0.5, 0.5],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
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
      -7.1137097419,
      -0.5220489355,
      0.8141124683,
      -7.4057732747,
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
      (-1.762674773070991 * conv) / ((Math.sqrt(3) * 4.12) / 2),
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
});
