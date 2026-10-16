import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { supercell } from "@/core/structure/operations/supercell";
import {
  ewaldEnergies,
  ewaldMatrix,
  ewaldMatrixEnergy,
  ewaldSum,
} from "@/core/structure/analysis/ewald";
import type { Structure } from "@/core/structure/structure";

function build(a: number[], fracs: number[][]): Structure {
  return {
    lattice: createLattice(a),
    sites: fracs.map((f) => ({
      species: { symbol: "X" },
      frac: new Float64Array(f),
    })),
  };
}

// Skewed triclinic cell, with fracs outside [0, 1).
const tri = build(
  [
    4.3832566716036805, 0.0, -0.38348526808969624, -2.8079987828503787,
    4.387812133674268, 2.7698822204367564, 0.0, 0.0, 8.3,
  ],
  [
    [1.15, 0.3, -0.2],
    [0.4, -0.45, 0.7],
    [0.7, 0.85, 0.25],
    [0.05, 0.6, 1.55],
    [0.33, 0.12, 0.48],
    [0.81, 0.57, 0.93],
  ],
);

// Rocksalt conventional cell doubled along a: 16 sites.
const rocksalt = supercell(
  build(
    [5.64, 0, 0, 0, 5.64, 0, 0, 0, 5.64],
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
  ),
  [2, 1, 1],
);

const relErr = (a: number, b: number) =>
  Math.abs(a - b) / Math.max(1, Math.abs(b));

const triCharges: number[][] = [
  [2, -2, 0, 1, -1, 0], // zero charges, neutral
  [2, -2, 0, 1, 0, 0], // net +1: background term
  [1.5, -0.7, -0.8, 0.25, -0.25, 0], // fractional
  [0, 0, 0, 0, 0, 0],
];

describe("ewaldMatrix", () => {
  it("q^T K q equals ewaldSum for any charges on one geometry", () => {
    const K = ewaldMatrix(tri);
    for (const q of triCharges) {
      expect(
        relErr(ewaldMatrixEnergy(K, q), ewaldSum(tri, q).total),
      ).toBeLessThan(1e-12);
    }
    const Krs = ewaldMatrix(rocksalt);
    const q = rocksalt.sites.map((_, i) => (i % 2 ? -1 : 1));
    expect(
      relErr(ewaldMatrixEnergy(Krs, q), ewaldSum(rocksalt, q).total),
    ).toBeLessThan(1e-12);
  });

  it("is symmetric", () => {
    const { n, data } = ewaldMatrix(tri);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        expect(data[i * n + j]).toBe(data[j * n + i]);
      }
    }
  });

  it("follows the ewaldSum options", () => {
    const opts = { accuracy: 14 }; // "auto" picks the exact erfc here
    const K = ewaldMatrix(tri, opts);
    const q = triCharges[0];
    expect(
      relErr(ewaldMatrixEnergy(K, q), ewaldSum(tri, q, opts).total),
    ).toBeLessThan(1e-13);
  });

  it("validates charge counts", () => {
    expect(() => ewaldMatrixEnergy(ewaldMatrix(tri), [1, -1])).toThrow(
      /2 charges for 6 sites/,
    );
  });
});

describe("ewaldEnergies", () => {
  it("matches per-structure ewaldSum across mixed geometries, in input order", () => {
    // Many charge assignments on the rocksalt geometry (matrix path), one
    // triclinic structure (sum path), interleaved.
    const structures: Structure[] = [];
    const charges: number[][] = [];
    for (let t = 0; t < 12; t++) {
      structures.push(rocksalt);
      charges.push(rocksalt.sites.map((_, i) => ((i * 7 + t) % 3) - 1));
      if (t === 5) {
        structures.push(tri);
        charges.push(triCharges[2]);
      }
    }
    const got = ewaldEnergies(structures, charges);
    expect(got).toHaveLength(structures.length);
    structures.forEach((s, i) => {
      expect(relErr(got[i], ewaldSum(s, charges[i]).total)).toBeLessThan(1e-12);
    });
  });

  it("validates its inputs", () => {
    expect(() => ewaldEnergies([tri], [])).toThrow(/0 charge vectors for 1/);
    expect(() =>
      ewaldEnergies(
        [rocksalt, rocksalt, rocksalt],
        [
          rocksalt.sites.map(() => 0),
          rocksalt.sites.map(() => NaN),
          rocksalt.sites.map(() => 0),
        ],
      ),
    ).toThrow(/finite/);
  });
});
