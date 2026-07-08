import { describe, expect, it } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { solve } from "@/core/matrix/operations/solve";
import { mul } from "@/core/matrix/operations/mul";
import { expectVectorClose } from "../../../helpers/matrix";

describe("solve", () => {
  it("solves 2x2 system", () => {
    // 2x + 3y = 8
    // 4x + 5y = 14
    // solution: x=1, y=2
    const A = createMatrix(2, 2, [2, 3, 4, 5]);
    const b = new Float64Array([8, 14]);

    const x = solve(A, b);

    expectVectorClose(x, [1, 2]);
  });

  it("solves 3x3 system", () => {
    //   x + 2y + 3z = 14
    //  2x +  y +  z =  7
    //  3x +  y + 2z = 11
    // solution: x=1, y=2, z=3
    const A = createMatrix(3, 3, [1, 2, 3, 2, 1, 1, 3, 1, 2]);
    const b = new Float64Array([14, 7, 11]);

    const x = solve(A, b);

    expectVectorClose(x, [1, 2, 3]);
  });

  it("satisfies A*solution = b", () => {
    const A = createMatrix(4, 4, [
      1, 0, 2, -1, 3, 0, 0, 5, 2, 1, 4, -3, 1, 0, 5, 0,
    ]);
    const b = new Float64Array([5, 12, 18, 7]);

    const x = solve(A, b);

    const Ax = mul(A, createMatrix(4, 1, Array.from(x)));

    for (let i = 0; i < 4; i++) {
      expect(Ax.data[i]).toBeCloseTo(b[i], 10);
    }
  });

  it("solves identity system (x = b)", () => {
    const A = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const b = new Float64Array([5, 6, 7]);

    const x = solve(A, b);

    expectVectorClose(x, [5, 6, 7]);
  });

  it("solves diagonal system", () => {
    const A = createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]);
    const b = new Float64Array([10, 18, 28]);

    const x = solve(A, b);

    expectVectorClose(x, [5, 6, 7]);
  });

  it("handles matrix requiring row swap (zero on diagonal)", () => {
    const A = createMatrix(3, 3, [0, 1, 2, 1, 0, 3, 4, 5, 6]);
    const b = new Float64Array([8, 7, 13]);

    const x = solve(A, b);

    const Ax = mul(A, createMatrix(3, 1, Array.from(x)));

    for (let i = 0; i < 3; i++) {
      expect(Ax.data[i]).toBeCloseTo(b[i], 10);
    }
  });

  it("solves upper triangular system", () => {
    const A = createMatrix(3, 3, [1, 0, 0, 2, 1, 0, 3, 4, 1]);
    const b = new Float64Array([1, 3, 6]);

    const x = solve(A, b);

    const Ax = mul(A, createMatrix(3, 1, Array.from(x)));

    for (let i = 0; i < 3; i++) {
      expect(Ax.data[i]).toBeCloseTo(b[i], 10);
    }
  });

  it("solves larger 8x8 system with random values", () => {
    const n = 8;
    let seed = 12345;

    const rand = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;

      return (seed / 2 ** 32) * 20 - 10;
    };

    const data = Array.from({ length: n * n }, () => rand());
    const A = createMatrix(n, n, data);
    const expected = Array.from({ length: n }, () => Math.floor(rand() * 10));

    const b = new Float64Array(n);

    for (let r = 0; r < n; r++) {
      let sum = 0;

      for (let c = 0; c < n; c++) {
        sum += A.data[r * n + c] * expected[c];
      }

      b[r] = sum;
    }

    const x = solve(A, b);

    for (let i = 0; i < n; i++) {
      expect(x[i]).toBeCloseTo(expected[i], 8);
    }
  });

  it("throws on non-square matrix", () => {
    const A = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);
    const b = new Float64Array([1, 2]);

    expect(() => solve(A, b)).toThrow("square matrix");
  });

  it("throws on dimension mismatch", () => {
    const A = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const b = new Float64Array([1, 2]);

    expect(() => solve(A, b)).toThrow("length");
  });

  it("throws on singular matrix", () => {
    const A = createMatrix(2, 2, [1, 2, 2, 4]);
    const b = new Float64Array([1, 2]);

    expect(() => solve(A, b)).toThrow("Singular matrix");
  });

  it("throws on zero row", () => {
    const A = createMatrix(3, 3, [1, 2, 3, 0, 0, 0, 4, 5, 6]);
    const b = new Float64Array([1, 2, 3]);

    expect(() => solve(A, b)).toThrow("Singular matrix");
  });

  it("handles negative values", () => {
    const A = createMatrix(2, 2, [-1, 3, 2, -4]);
    const b = new Float64Array([5, -10]);

    const x = solve(A, b);

    const Ax = mul(A, createMatrix(2, 1, Array.from(x)));

    for (let i = 0; i < 2; i++) {
      expect(Ax.data[i]).toBeCloseTo(b[i], 10);
    }
  });

  it("handles fractional values", () => {
    const A = createMatrix(2, 2, [0.5, 1.5, 2.5, 3.5]);
    const b = new Float64Array([4, 12]);

    const x = solve(A, b);

    const Ax = mul(A, createMatrix(2, 1, Array.from(x)));

    for (let i = 0; i < 2; i++) {
      expect(Ax.data[i]).toBeCloseTo(b[i], 8);
    }
  });

  it("solves 2x2 with symmetric positive definite matrix", () => {
    const A = createMatrix(2, 2, [2, 1, 1, 2]);
    const b = new Float64Array([3, 3]);

    const x = solve(A, b);

    expectVectorClose(x, [1, 1]);
  });
});
