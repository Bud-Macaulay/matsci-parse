import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { reciprocalLattice } from "@/core/lattice/reciprocalLattice";
import { reciprocalLatticeCrystallographic } from "@/core/lattice/reciprocalLatticeCrystallographic";
import { matMulFloat64, expectIdentityFloat64 } from "../../helpers/lattice";

describe("reciprocalLatticeCrystallographic", () => {
  it("satisfies A · A*_crystᵀ = I", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const rec = reciprocalLatticeCrystallographic(lattice);

    const A = lattice.basis.data;
    const B = rec.basis.data;

    const prod = matMulFloat64(A, B);

    expectIdentityFloat64(prod);
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
