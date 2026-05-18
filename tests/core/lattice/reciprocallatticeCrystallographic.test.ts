import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { reciprocalLattice } from "@/core/lattice/reciprocalLattice";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";

function matMul(a: Float64Array, b: Float64Array) {
  const n = 3;
  const out = new Float64Array(9);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += a[i * n + k] * b[k * n + j];
      }
      out[i * n + j] = sum;
    }
  }

  return out;
}

function expectIdentity(mat: Float64Array, eps = 1e-10) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const expected = i === j ? 1 : 0;
      expect(Math.abs(mat[i * 3 + j] - expected)).toBeLessThan(eps);
    }
  }
}

describe("reciprocalLatticeCrystallographic", () => {
  it("satisfies A · A*_crystᵀ = I", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const rec = reciprocalLatticeCrystallographic(lattice);

    const A = lattice.basis.data;
    const B = rec.basis.data;

    const prod = matMul(A, B);

    expectIdentity(prod);
  });

  it("differs from physical reciprocal lattice only by 2π scaling", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const rec = reciprocalLattice(lattice);
    const recC = reciprocalLatticeCrystallographic(lattice);

    for (let i = 0; i < 9; i++) {
      expect(rec.basis.data[i]).toBeCloseTo(
        recC.basis.data[i] * 2 * Math.PI,
        10,
      );
    }
  });

  it("returns finite values", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const rec = reciprocalLatticeCrystallographic(lattice);

    for (const v of rec.basis.data) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
