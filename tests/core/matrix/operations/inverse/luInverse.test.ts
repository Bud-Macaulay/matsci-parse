import { describe, expect, it } from "vitest";
import { createMatrix, identity } from "@/core/matrix/matrix";
import { luInverse } from "@/core/matrix/operations/inverse/luInverse";

function expectIdentity(m: ReturnType<typeof createMatrix>) {
  const n = m.rows;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = m.data[r * n + c];

      if (r === c) {
        expect(val).toBeCloseTo(1);
      } else {
        expect(val).toBeCloseTo(0);
      }
    }
  }
}

function multiplyMatrices(
  A: ReturnType<typeof createMatrix>,
  B: ReturnType<typeof createMatrix>,
) {
  const n = A.rows;
  const result = createMatrix(n, n);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let sum = 0;

      for (let k = 0; k < n; k++) {
        sum += A.data[r * n + k] * B.data[k * n + c];
      }

      result.data[r * n + c] = sum;
    }
  }

  return result;
}

describe("luInverse", () => {
  describe("basic functionality", () => {
    it("inverts identity matrix", () => {
      const I = identity(3);
      const inv = luInverse(I);

      expectIdentity(inv);
    });

    it("inverts a simple 2x2 matrix", () => {
      const A = createMatrix(2, 2, [4, 7, 2, 6]);
      const inv = luInverse(A);

      expect(inv.data[0]).toBeCloseTo(0.6);
      expect(inv.data[1]).toBeCloseTo(-0.7);
      expect(inv.data[2]).toBeCloseTo(-0.2);
      expect(inv.data[3]).toBeCloseTo(0.4);
    });

    it("inverts 1x1 matrix", () => {
      const A = createMatrix(1, 1, [5]);
      const inv = luInverse(A);

      expect(inv.data[0]).toBeCloseTo(0.2);
    });

    it("satisfies A⁻¹A = I for 3x3", () => {
      const A = createMatrix(3, 3, [3, 0, 2, 2, 0, -2, 0, 1, 1]);

      const inv = luInverse(A);
      const result = multiplyMatrices(inv, A);

      expectIdentity(result);
    });

    it("satisfies AA⁻¹ = I for 3x3", () => {
      const A = createMatrix(3, 3, [3, 0, 2, 2, 0, -2, 0, 1, 1]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });
  });

  describe("error handling", () => {
    it("throws when matrix is not square", () => {
      const A = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

      expect(() => luInverse(A)).toThrow("Square matrix required");
    });

    it("throws on singular matrix (proportional rows)", () => {
      const A = createMatrix(2, 2, [1, 2, 2, 4]);

      expect(() => luInverse(A)).toThrow("Singular matrix");
    });

    it("throws on zero row", () => {
      const A = createMatrix(3, 3, [1, 2, 3, 0, 0, 0, 4, 5, 6]);

      expect(() => luInverse(A)).toThrow("Singular matrix");
    });

    it("throws on linearly dependent rows", () => {
      const A = createMatrix(3, 3, [1, 2, 3, 2, 4, 6, 7, 8, 9]);

      expect(() => luInverse(A)).toThrow("Singular matrix");
    });

    it("throws on zero determinant with complex dependencies", () => {
      const A = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 5, 7, 9]);

      expect(() => luInverse(A)).toThrow("Singular matrix");
    });
  });

  describe("pivoting", () => {
    it("handles matrix requiring row swap", () => {
      const A = createMatrix(3, 3, [0, 1, 2, 1, 0, 3, 4, 5, 6]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("handles multiple row swaps", () => {
      const A = createMatrix(3, 3, [0, 0, 1, 0, 1, 0, 1, 0, 0]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("handles tiny pivot values", () => {
      const A = createMatrix(2, 2, [1e-12, 1, 1, 1]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });
  });

  describe("numerical edge cases", () => {
    it("handles negative values", () => {
      const A = createMatrix(2, 2, [-1, 2, 3, -4]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("handles matrix with negative determinant", () => {
      const A = createMatrix(3, 3, [1, 2, 3, 0, 1, 4, 5, 6, 0]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("handles fractional values", () => {
      const A = createMatrix(2, 2, [0.5, 1.5, 2.5, 3.5]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("handles very small non-zero values", () => {
      const A = createMatrix(2, 2, [1e-6, 2e-6, 3e-6, 5e-6]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("handles ill-conditioned matrix", () => {
      const A = createMatrix(2, 2, [1, 1, 1, 1.000001]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });
  });

  describe("larger matrices", () => {
    it("inverts 4x4 matrix", () => {
      const A = createMatrix(
        4,
        4,
        [1, 0, 2, -1, 3, 0, 0, 5, 2, 1, 4, -3, 1, 0, 5, 0],
      );

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("inverts 5x5 matrix", () => {
      const A = createMatrix(
        5,
        5,
        [
          2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0,
          1, 2,
        ],
      );

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("inverts random dense 6x6 matrix", () => {
      const A = createMatrix(
        6,
        6,
        [
          4, 2, 1, 7, 3, 5, 0, 6, 2, 1, 8, 4, 5, 1, 9, 3, 2, 6, 7, 3, 0, 5, 1,
          2, 2, 8, 4, 6, 7, 1, 1, 5, 3, 2, 4, 9,
        ],
      );

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });
  });

  describe("immutability", () => {
    it("does not mutate input matrix", () => {
      const A = createMatrix(2, 2, [4, 7, 2, 6]);

      const original = Array.from(A.data);

      luInverse(A);

      expect(Array.from(A.data)).toEqual(original);
    });

    it("does not mutate input matrix during pivoting", () => {
      const A = createMatrix(3, 3, [0, 1, 2, 1, 0, 3, 4, 5, 6]);

      const original = Array.from(A.data);

      luInverse(A);

      expect(Array.from(A.data)).toEqual(original);
    });
  });

  describe("special matrices", () => {
    it("inverts diagonal matrix", () => {
      const A = createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]);

      const inv = luInverse(A);

      expect(inv.data[0]).toBeCloseTo(0.5);
      expect(inv.data[4]).toBeCloseTo(1 / 3);
      expect(inv.data[8]).toBeCloseTo(0.25);
    });

    it("inverts upper triangular matrix", () => {
      const A = createMatrix(3, 3, [1, 2, 3, 0, 1, 4, 0, 0, 1]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("inverts lower triangular matrix", () => {
      const A = createMatrix(3, 3, [1, 0, 0, 2, 1, 0, 3, 4, 1]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("inverts permutation matrix", () => {
      const A = createMatrix(3, 3, [0, 1, 0, 0, 0, 1, 1, 0, 0]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });

    it("inverts symmetric positive definite matrix", () => {
      const A = createMatrix(3, 3, [4, 1, 1, 1, 3, 0, 1, 0, 2]);

      const inv = luInverse(A);
      const result = multiplyMatrices(A, inv);

      expectIdentity(result);
    });
  });
});
