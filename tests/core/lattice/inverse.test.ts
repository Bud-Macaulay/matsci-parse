import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { inverse } from "@/core/lattice/inverse";

function expectIdentity(mat: Float64Array, n = 3, eps = 1e-10) {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = mat[i * n + j];
      const expected = i === j ? 1 : 0;
      expect(Math.abs(v - expected)).toBeLessThan(eps);
    }
  }
}

describe("lattice inverse", () => {
  it("returns correct inverse for orthogonal lattice", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const inv = inverse(lattice);

    // A * A^-1 = I
    const a = lattice.basis.data;
    const b = inv.data;

    const n = 3;
    const result = new Float64Array(9);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += a[i * n + k] * b[k * n + j];
        }
        result[i * n + j] = sum;
      }
    }

    expectIdentity(result);
  });

  it("inverts a simple shear lattice", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 1, 0, 0, 1, 0, 0, 0, 1]),
    };

    const inv = inverse(lattice);

    const a = lattice.basis.data;
    const b = inv.data;

    const n = 3;
    const result = new Float64Array(9);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += a[i * n + k] * b[k * n + j];
        }
        result[i * n + j] = sum;
      }
    }

    expectIdentity(result);
  });

  it("produces finite values", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const inv = inverse(lattice);

    for (const v of inv.data) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
