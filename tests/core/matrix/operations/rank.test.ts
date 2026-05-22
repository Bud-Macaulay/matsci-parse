import { describe, expect, it } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { rank } from "@/core/matrix/operations/rank";

describe("rank", () => {
  it("returns full rank for identity matrix", () => {
    const m = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);

    expect(rank(m)).toBe(3);
  });

  it("detects rank 1 matrix", () => {
    const m = createMatrix(2, 2, [1, 2, 2, 4]);

    expect(rank(m)).toBe(1);
  });

  it("returns 0 for zero matrix", () => {
    const m = createMatrix(3, 3);

    expect(rank(m)).toBe(0);
  });

  it("handles rectangular full rank (rows < cols)", () => {
    const m = createMatrix(2, 3, [1, 0, 0, 0, 1, 0]);

    expect(rank(m)).toBe(2);
  });

  it("handles rectangular full rank (cols < rows)", () => {
    const m = createMatrix(3, 2, [1, 0, 0, 1, 1, 1]);

    expect(rank(m)).toBe(2);
  });

  it("detects linearly dependent rows", () => {
    const m = createMatrix(3, 3, [1, 2, 3, 2, 4, 6, 3, 6, 9]);

    expect(rank(m)).toBe(1);
  });

  it("handles nearly dependent rows (numerical stability)", () => {
    const m = createMatrix(2, 2, [1, 1, 1, 1.0000000001]);

    expect(rank(m)).toBe(2);
  });

  it("handles 1x1 matrix", () => {
    expect(rank(createMatrix(1, 1, [5]))).toBe(1);
    expect(rank(createMatrix(1, 1, [0]))).toBe(0);
  });

  it("computes rank of full rank 2x2 matrix", () => {
    const m = createMatrix(2, 2, [1, 0, 0, 1]);

    expect(rank(m)).toBe(2);
  });

  it("computes rank of rank-deficient matrix", () => {
    const m = createMatrix(2, 2, [1, 2, 2, 4]);

    expect(rank(m)).toBe(1);
  });

  it("handles rectangular matrix (wide)", () => {
    const m = createMatrix(2, 3, [1, 2, 3, 2, 4, 6]);

    expect(rank(m)).toBe(1);
  });

  it("handles rectangular matrix (tall)", () => {
    const m = createMatrix(3, 2, [1, 2, 2, 4, 3, 6]);

    expect(rank(m)).toBe(1);
  });

  it("forces pivoting scenario (numerically stable test)", () => {
    // This matrix forces a zero pivot in naive elimination
    // and requires row swap internally
    const m = createMatrix(3, 3, [0, 1, 2, 1, 2, 3, 2, 3, 4]);

    expect(rank(m)).toBe(2);
  });
});
