import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { gram } from "@/core/matrix/operations/gram";
import { mul } from "@/core/matrix/operations/mul";
import { transpose } from "@/core/matrix/operations/transpose";

describe("gram", () => {
  it("computes B·Bᵀ for a square matrix", () => {
    const B = createMatrix(2, 2, [1, 2, 3, 4]);

    expect(Array.from(gram(B).data)).toEqual([5, 11, 11, 25]);
  });

  it("computes an m×m result for a rectangular m×n matrix", () => {
    const B = createMatrix(2, 3, [1, 0, 2, -1, 3, 1]);
    const result = gram(B);

    expect(result.rows).toBe(2);
    expect(result.cols).toBe(2);
    expect(Array.from(result.data)).toEqual([5, 1, 1, 11]);
  });

  it("matches mul(B, transpose(B))", () => {
    const B = createMatrix(3, 3, [2, -1, 0.5, 0, 3, 1, 4, 1, -2]);

    expect(Array.from(gram(B).data)).toEqual(
      Array.from(mul(B, transpose(B)).data),
    );
  });

  it("returns a 0×0 matrix for an empty input", () => {
    const result = gram(createMatrix(0, 3));

    expect(result.rows).toBe(0);
    expect(result.data.length).toBe(0);
  });
});
