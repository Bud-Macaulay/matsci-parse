import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { lu } from "@/core/matrix/operations/lu";
import { mul } from "@/core/matrix/operations/mul";

describe("lu", () => {
  it("decomposes 2x2 matrix", () => {
    const A = createMatrix(2, 2, [4, 6, 3, 3]);
    // A = [4 6; 3 3], row-major layout
    // PA = LU
    const { LU, piv, singular } = lu(A);

    expect(singular).toBe(false);
    expect(Array.from(piv)).toEqual([0, 1]);

    const n = A.rows;
    const data = LU.data;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let l = r === c ? 1 : 0;

        if (c < r) l = data[r * n + c];

        const u = c >= r ? data[r * n + c] : 0;

        const pa = r === 0 ? A.data[r * n + c] : A.data[r * n + c];

        let sum = 0;

        for (let k = 0; k < n; k++) {
          const lk = k === r ? 1 : k < r ? data[r * n + k] : 0;
          const uk = k > c ? 0 : data[k * n + c];

          sum += lk * uk;
        }

        expect(sum).toBeCloseTo(pa);
      }
    }
  });

  it("returns singular for zero matrix", () => {
    const A = createMatrix(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);

    const { singular } = lu(A);

    expect(singular).toBe(true);
  });

  it("returns singular for linearly dependent rows", () => {
    const A = createMatrix(3, 3, [1, 2, 3, 2, 4, 6, 7, 8, 9]);

    const { singular } = lu(A);

    expect(singular).toBe(true);
  });

  it("satisfies PA = LU for 3x3 with pivoting", () => {
    const A = createMatrix(3, 3, [0, 1, 2, 1, 0, 3, 4, 5, 6]);

    const { LU, piv, singular } = lu(A);

    expect(singular).toBe(false);

    const n = 3;
    const data = LU.data;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let sum = 0;

        for (let k = 0; k < n; k++) {
          const l = k < r ? data[r * n + k] : k === r ? 1 : 0;
          const u = k > c ? 0 : data[k * n + c];

          sum += l * u;
        }

        const pa = A.data[piv[r] * n + c];

        expect(sum).toBeCloseTo(pa);
      }
    }
  });

  it("satisfies PA = LU for 5x5 matrix", () => {
    const A = createMatrix(5, 5, [
      2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1,
      2,
    ]);

    const { LU, piv, singular } = lu(A);

    expect(singular).toBe(false);

    const n = 5;
    const data = LU.data;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let sum = 0;

        for (let k = 0; k < n; k++) {
          const l = k < r ? data[r * n + k] : k === r ? 1 : 0;
          const u = k > c ? 0 : data[k * n + c];

          sum += l * u;
        }

        const pa = A.data[piv[r] * n + c];

        expect(sum).toBeCloseTo(pa);
      }
    }
  });

  it("throws on non-square matrix", () => {
    const A = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    expect(() => lu(A)).toThrow("square matrix");
  });

  it("handles matrix requiring row swap", () => {
    const A = createMatrix(3, 3, [0, 1, 2, 1, 0, 3, 4, 5, 6]);

    // row 0 has 0 in first col so pivoting should move it
    const { piv, singular } = lu(A);

    expect(singular).toBe(false);
    expect(piv[0]).toBe(2);
  });

  it("does not mutate input matrix", () => {
    const A = createMatrix(2, 2, [4, 7, 2, 6]);

    const original = Array.from(A.data);

    lu(A);

    expect(Array.from(A.data)).toEqual(original);
  });

  it("handles identity matrix", () => {
    const A = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const { LU, singular } = lu(A);

    expect(singular).toBe(false);

    const data = LU.data;

    expect(data[0]).toBeCloseTo(1);
    expect(data[4]).toBeCloseTo(1);
    expect(data[8]).toBeCloseTo(1);
  });

  it("handles negative and fractional values", () => {
    const A = createMatrix(2, 2, [-1, 2, 3, -4]);

    const { singular } = lu(A);

    expect(singular).toBe(false);
  });

  it("handles tiny pivot values with row swap", () => {
    const A = createMatrix(2, 2, [1e-12, 1, 1, 1]);

    const { singular } = lu(A);

    expect(singular).toBe(false);
  });
});
