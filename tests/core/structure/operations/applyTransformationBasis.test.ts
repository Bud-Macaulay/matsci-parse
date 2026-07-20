import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { transpose } from "@/core/matrix/operations/transpose";
import { mul } from "@/core/matrix/operations/mul";
import { createLattice } from "@/core/lattice/lattice";
import { applyTransformationBasis } from "@/core/structure/operations/applyTransformationBasis";
import type { Matrix } from "@/core/matrix/matrix";
import type { Structure } from "@/core/structure/structure";

function makeStructure(): Structure {
  return {
    lattice: createLattice([3, 4, 5]),
    sites: [
      { species: { symbol: "Si" }, frac: new Float64Array([0.0, 0.0, 0.0]) },
      { species: { symbol: "Si" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
    ],
  };
}

describe("applyTransformationBasis", () => {
  it("identity matrix returns equivalent structure", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const result = applyTransformationBasis(s, P);

    for (let i = 0; i < 9; i++) {
      expect(result.lattice.basis.data[i]).toBeCloseTo(s.lattice.basis.data[i]);
    }

    expect(result.sites.length).toBe(s.sites.length);

    for (let i = 0; i < s.sites.length; i++) {
      for (let j = 0; j < 3; j++) {
        expect(result.sites[i].frac[j]).toBeCloseTo(s.sites[i].frac[j]);
      }
    }
  });

  it("2x diagonal doubles lattice and halves fractional coords", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [2, 0, 0, 0, 2, 0, 0, 0, 2]);
    const result = applyTransformationBasis(s, P);

    for (let i = 0; i < 9; i++) {
      expect(result.lattice.basis.data[i]).toBeCloseTo(
        s.lattice.basis.data[i] * 2,
      );
    }

    for (let i = 0; i < s.sites.length; i++) {
      for (let j = 0; j < 3; j++) {
        expect(result.sites[i].frac[j]).toBeCloseTo(s.sites[i].frac[j] / 2);
      }
    }
  });

  it("round-trip with inverse restores original", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 1, 0, 0, 2, 1, 1, 0, 3]);
    const intermediate = applyTransformationBasis(s, P);
    const Pinv = inverse3x3(P);
    const restored = applyTransformationBasis(intermediate, Pinv);

    for (let i = 0; i < 9; i++) {
      expect(restored.lattice.basis.data[i]).toBeCloseTo(
        s.lattice.basis.data[i],
        8,
      );
    }

    for (let i = 0; i < s.sites.length; i++) {
      for (let j = 0; j < 3; j++) {
        expect(restored.sites[i].frac[j]).toBeCloseTo(s.sites[i].frac[j], 8);
      }
    }
  });

  it("non-diagonal matrix transforms lattice correctly", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 1, 0, 0, 1, 0, 0, 0, 1]);
    const result = applyTransformationBasis(s, P);

    expect(result.lattice.basis.data[0]).toBeCloseTo(3);
    expect(result.lattice.basis.data[1]).toBeCloseTo(4);
    expect(result.lattice.basis.data[2]).toBeCloseTo(0);
    expect(result.lattice.basis.data[3]).toBeCloseTo(0);
    expect(result.lattice.basis.data[4]).toBeCloseTo(4);
    expect(result.lattice.basis.data[5]).toBeCloseTo(0);
    expect(result.lattice.basis.data[6]).toBeCloseTo(0);
    expect(result.lattice.basis.data[7]).toBeCloseTo(0);
    expect(result.lattice.basis.data[8]).toBeCloseTo(5);
  });

  it("throws on singular matrix", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 0, 0, 2, 0, 0, 0, 0, 1]);

    expect(() => applyTransformationBasis(s, P)).toThrow("Singular matrix");
  });

  it("preserves site species and properties", () => {
    const s: Structure = {
      lattice: createLattice([3, 4, 5]),
      sites: [
        {
          species: { symbol: "Fe", properties: { magneticMoment: 2.2 } },
          frac: new Float64Array([0.1, 0.2, 0.3]),
        },
      ],
    };
    const P = createMatrix(3, 3, [2, 0, 0, 0, 1, 0, 0, 0, 1]);
    const result = applyTransformationBasis(s, P);

    expect(result.sites[0].species.symbol).toBe("Fe");
    expect(result.sites[0].species.properties?.magneticMoment).toBe(2.2);
  });
});

// Seeded PRNG (mulberry32) for reproducible random matrices
function mulberry32(seed: number) {
  let s = seed | 0;

  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInvertibleMatrix(rng: () => number): Matrix {
  const data = new Float64Array(9);

  for (let i = 0; i < 9; i++) {
    data[i] = rng() * 2 - 1;
  }

  // Diagonal dominance guarantees invertibility
  for (let i = 0; i < 3; i++) {
    data[i * 3 + i] += 5;
  }

  return createMatrix(3, 3, data);
}

function toCartesian(lattice: Matrix, frac: Float64Array): Float64Array {
  const basisT = transpose(lattice);
  const vec = { rows: 3, cols: 1, data: new Float64Array([frac[0], frac[1], frac[2]]) };
  const result = mul(basisT, vec);

  return new Float64Array([result.data[0], result.data[1], result.data[2]]);
}

describe("Cartesian invariance across random structures", () => {
  const NUM_TRIALS = 100;
  const rng = mulberry32(42);

  it("preserves Cartesian positions for random skewed lattices and transforms", () => {
    for (let trial = 0; trial < NUM_TRIALS; trial++) {
      const lattice = createLattice(randomInvertibleMatrix(rng));
      const fracs = [
        new Float64Array([rng(), rng(), rng()]),
        new Float64Array([0.25, 0.5, 0.75]),
        new Float64Array([0, 0, 0]),
        new Float64Array([0.1, 0.9, 0.3]),
      ];

      const structure: Structure = {
        lattice,
        sites: fracs.map((f) => ({ species: { symbol: "Si" }, frac: f })),
      };

      const P = randomInvertibleMatrix(rng);
      const transformed = applyTransformationBasis(structure, P);

      for (let i = 0; i < fracs.length; i++) {
        const cartOriginal = toCartesian(lattice.basis, fracs[i]);
        const cartTransformed = toCartesian(
          transformed.lattice.basis,
          transformed.sites[i].frac,
        );

        for (let j = 0; j < 3; j++) {
          expect(cartTransformed[j]).toBeCloseTo(cartOriginal[j], 10);
        }
      }
    }
  });

  it("round-trip P then P^{-1} restores original lattice and fracs", () => {
    for (let trial = 0; trial < NUM_TRIALS; trial++) {
      const lattice = createLattice(randomInvertibleMatrix(rng));
      const fracs = [
        new Float64Array([rng(), rng(), rng()]),
        new Float64Array([0.1, 0.2, 0.3]),
      ];

      const structure: Structure = {
        lattice,
        sites: fracs.map((f) => ({ species: { symbol: "Fe" }, frac: f })),
      };

      const P = randomInvertibleMatrix(rng);
      const intermediate = applyTransformationBasis(structure, P);
      const Pinv = inverse3x3(P);
      const restored = applyTransformationBasis(intermediate, Pinv);

      for (let i = 0; i < 9; i++) {
        expect(restored.lattice.basis.data[i]).toBeCloseTo(
          lattice.basis.data[i],
          8,
        );
      }

      for (let i = 0; i < fracs.length; i++) {
        for (let j = 0; j < 3; j++) {
          expect(restored.sites[i].frac[j]).toBeCloseTo(fracs[i][j], 8);
        }
      }
    }
  });

  it("chained P1, P2, then (P2*P1)^{-1} restores original", () => {
    for (let trial = 0; trial < NUM_TRIALS; trial++) {
      const lattice = createLattice(randomInvertibleMatrix(rng));
      const fracs = [
        new Float64Array([rng(), rng(), rng()]),
        new Float64Array([0.4, 0.6, 0.8]),
      ];

      const structure: Structure = {
        lattice,
        sites: fracs.map((f) => ({ species: { symbol: "Cu" }, frac: f })),
      };

      const P1 = randomInvertibleMatrix(rng);
      const P2 = randomInvertibleMatrix(rng);

      const step1 = applyTransformationBasis(structure, P1);
      const step2 = applyTransformationBasis(step1, P2);

      const P2P1 = mul(P2, P1);
      const combined_inv = inverse3x3(P2P1);
      const restored = applyTransformationBasis(step2, combined_inv);

      for (let i = 0; i < 9; i++) {
        expect(restored.lattice.basis.data[i]).toBeCloseTo(
          lattice.basis.data[i],
          8,
        );
      }

      for (let i = 0; i < fracs.length; i++) {
        for (let j = 0; j < 3; j++) {
          expect(restored.sites[i].frac[j]).toBeCloseTo(fracs[i][j], 8);
        }
      }
    }
  });
});
