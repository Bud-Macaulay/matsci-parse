import { describe, expect, it } from "vitest";
import { createMatrix, identity, Matrix } from "@/core/matrix/matrix";
import { inverse4x4 } from "@/core/matrix/operations/inverse/inverse4x4";

function expectIdentity(m: ReturnType<typeof createMatrix>) {
  const n = m.rows;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = m.data[r * n + c];
      expect(v).toBeCloseTo(r === c ? 1 : 0);
    }
  }
}

export function createRandomInvertible4x4(): Matrix {
  const n = 4;
  const L = new Float64Array(16);
  const U = new Float64Array(16);

  // ---- L (lower triangular, diag = 1) ----
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r === c) {
        L[r * n + c] = 1;
      } else if (r > c) {
        L[r * n + c] = (Math.random() - 0.5) * 2; // [-1, 1]
      } else {
        L[r * n + c] = 0;
      }
    }
  }

  // ---- U (upper triangular, non-zero diagonal) ----
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r <= c) {
        // avoid tiny diagonals → prevents near-singular matrices
        const val = (Math.random() - 0.5) * 4;
        U[r * n + c] = r === c ? val + 2 : val;
      } else {
        U[r * n + c] = 0;
      }
    }
  }

  // ---- multiply A = L * U ----
  const A = createMatrix(n, n);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += L[r * n + k] * U[k * n + c];
      }
      A.data[r * n + c] = sum;
    }
  }

  return A;
}

function multiply(A: any, B: any) {
  const n = A.rows;
  const out = createMatrix(n, n);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += A.data[r * n + k] * B.data[k * n + c];
      }
      out.data[r * n + c] = sum;
    }
  }

  return out;
}

describe("inverse4x4", () => {
  it("inverts identity", () => {
    const I = identity(4);
    const inv = inverse4x4(I);
    expectIdentity(inv);
  });

  it("inverts known matrix", () => {
    const A = createMatrix(
      4,
      4,
      [1, 0, 2, -1, 3, 0, 0, 5, 2, 1, 4, -3, 1, 0, 5, 0],
    );

    const inv = inverse4x4(A);
    const res = multiply(inv, A);

    expectIdentity(res);
  });

  it("handles permutation matrix", () => {
    const A = createMatrix(
      4,
      4,
      [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0],
    );

    const inv = inverse4x4(A);
    const res = multiply(inv, A);

    expectIdentity(res);
  });

  it("handles diagonal matrix", () => {
    const A = createMatrix(
      4,
      4,
      [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 5],
    );

    const inv = inverse4x4(A);
    const res = multiply(inv, A);

    expectIdentity(res);
  });

  it("throws on singular matrix", () => {
    const A = createMatrix(
      4,
      4,
      [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16],
    );

    expect(() => inverse4x4(A)).toThrow("Singular matrix");
  });

  it("random matrices satisfy A * inv(A) = I", () => {
    for (let i = 0; i < 50; i++) {
      const A = createRandomInvertible4x4();
      const inv = inverse4x4(A);
      const I = multiply(A, inv);
      expectIdentity(I);
    }
  });

  it("throws on non-4x4 matrix", () => {
    const A = createMatrix(3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    expect(() => inverse4x4(A)).toThrow();
  });
});
