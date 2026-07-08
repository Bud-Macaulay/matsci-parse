import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { reciprocalLattice } from "@/core/lattice/reciprocalLattice";
import { matMulFloat64, expectIdentityFloat64 } from "../../helpers/lattice";

describe("reciprocalLattice", () => {
  it("satisfies A · A*ᵀ = 2π I", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const rec = reciprocalLattice(lattice);

    const A = lattice.basis.data;
    const B = rec.basis.data;

    const prod = matMulFloat64(A, B);

    const scaled = new Float64Array(9);
    for (let i = 0; i < 9; i++) {
      scaled[i] = prod[i] / (2 * Math.PI);
    }

    expectIdentityFloat64(scaled);
  });

  it("returns finite values", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    const rec = reciprocalLattice(lattice);

    for (const v of rec.basis.data) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
