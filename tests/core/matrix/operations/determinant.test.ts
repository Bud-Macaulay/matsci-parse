import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { determinant } from "@/core/matrix/operations/determinant";

describe("determinant", () => {
  it("computes determinant of 1x1 matrix", () => {
    const a = createMatrix(1, 1, [7]);

    expect(determinant(a)).toBe(7);
  });

  it("computes determinant of 2x2 matrix", () => {
    const a = createMatrix(2, 2, [1, 2, 3, 4]);

    // 1*4 - 2*3 = -2
    expect(determinant(a)).toBe(-2);
  });

  it("computes determinant of 3x3 matrix", () => {
    const a = createMatrix(3, 3, [6, 1, 1, 4, -2, 5, 2, 8, 7]);

    expect(determinant(a)).toBe(-306);
  });

  it("returns 0 for singular matrix (zero row)", () => {
    const a = createMatrix(3, 3, [1, 2, 3, 0, 0, 0, 4, 5, 6]);

    expect(determinant(a)).toBe(0);
  });

  it("det(A) equals det(Aᵀ)", () => {
    const a = createMatrix(3, 3, [2, 3, 1, 4, 5, 6, 7, 8, 9]);

    const at = createMatrix(3, 3, [2, 4, 7, 3, 5, 8, 1, 6, 9]);

    expect(determinant(a)).toBe(determinant(at));
  });

  it("row swap flips sign", () => {
    const a = createMatrix(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const swapped = createMatrix(3, 3, [4, 5, 6, 1, 2, 3, 7, 8, 9]);

    const detA = determinant(a);
    const detB = determinant(swapped);

    // handle floating + signed zero safely
    expect(detB).toBeCloseTo(-detA);
  });

  it("identity matrix has determinant 1", () => {
    const I = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);

    expect(determinant(I)).toBe(1);
  });

  it("handles negative values correctly", () => {
    const a = createMatrix(2, 2, [-1, 2, 3, -4]);

    // (-1)(-4) - (2)(3) = 4 - 6 = -2
    expect(determinant(a)).toBe(-2);
  });

  it("throws on non-square matrix", () => {
    const a = createMatrix(2, 3, [1, 2, 3, 4, 5, 6]);

    expect(() => determinant(a)).toThrow();
  });

  it("det(A) equals det(Aᵀ) for 20 random 8x8 matrices", () => {
    const size = 8;

    let seed = 12345;

    const rand = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;

      return seed / 2 ** 32;
    };

    for (let k = 0; k < 20; k++) {
      const data = Array.from(
        { length: size * size },
        () => Math.floor(rand() * 21) - 10,
      );

      const a = createMatrix(size, size, data);

      const at = createMatrix(
        size,
        size,
        Array.from({ length: size * size }, (_, i) => {
          const row = Math.floor(i / size);
          const col = i % size;

          return data[col * size + row];
        }),
      );

      expect(determinant(at)).toBeCloseTo(determinant(a), 6);
    }
  });
});
