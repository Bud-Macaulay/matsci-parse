import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { gramSchmidt } from "@/core/matrix/operations/gramSchmidt";
import { mul } from "@/core/matrix/operations/mul";

function rowDot(a: Float64Array, cols: number, i: number, j: number) {
  let s = 0;
  for (let k = 0; k < cols; k++) s += a[i * cols + k] * a[j * cols + k];
  return s;
}

describe("gramSchmidt", () => {
  it("orthogonalizes a 2×2 basis", () => {
    const B = createMatrix(2, 2, [1, 1, 1, 0]);
    const { orthogonal, mu } = gramSchmidt(B);

    expect(Array.from(orthogonal.data)).toEqual([1, 1, 0.5, -0.5]);
    expect(Array.from(mu.data)).toEqual([1, 0, 0.5, 1]);
  });

  it("produces mutually orthogonal rows with B = μ·B*", () => {
    const B = createMatrix(3, 3, [2, -1, 0.5, 0, 3, 1, 4, 1, -2]);
    const { orthogonal, mu } = gramSchmidt(B);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < i; j++) {
        expect(rowDot(orthogonal.data, 3, i, j)).toBeCloseTo(0, 12);
      }
    }

    const recon = mul(mu, orthogonal);
    for (let i = 0; i < 9; i++) {
      expect(recon.data[i]).toBeCloseTo(B.data[i], 12);
    }
  });

  it("handles rectangular inputs (fewer rows than columns)", () => {
    const B = createMatrix(2, 3, [1, 0, 0, 1, 1, 0]);
    const { orthogonal, mu } = gramSchmidt(B);

    expect(orthogonal.rows).toBe(2);
    expect(orthogonal.cols).toBe(3);
    expect(mu.rows).toBe(2);
    expect(Array.from(orthogonal.data)).toEqual([1, 0, 0, 0, 1, 0]);
  });

  it("zeroes dependent rows and gives later rows μ = 0 against them", () => {
    const B = createMatrix(3, 2, [1, 0, 2, 0, 0, 1]);
    const { orthogonal, mu } = gramSchmidt(B);

    expect(Array.from(orthogonal.data.subarray(2, 4))).toEqual([0, 0]);
    expect(mu.data[2 * 3 + 1]).toBe(0);
    expect(Array.from(orthogonal.data.subarray(4, 6))).toEqual([0, 1]);
  });
});
