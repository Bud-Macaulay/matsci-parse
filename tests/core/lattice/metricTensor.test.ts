import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { metricTensor } from "@/core/lattice/metricTensor";

describe("metricTensor", () => {
  it("returns identity for orthonormal lattice", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    const g = metricTensor(lattice);

    expect(Array.from(g.data)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("produces correct diagonal entries for scaled orthogonal lattice", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const g = metricTensor(lattice);
    const d = g.data;

    expect(d[0]).toBe(4);
    expect(d[4]).toBe(9);
    expect(d[8]).toBe(16);

    // off-diagonals should be zero
    expect(d[1]).toBe(0);
    expect(d[2]).toBe(0);
    expect(d[3]).toBe(0);
    expect(d[5]).toBe(0);
    expect(d[6]).toBe(0);
    expect(d[7]).toBe(0);
  });

  it("detects shear via off-diagonal terms", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 1, 1, 0, 0, 0, 1]),
    };

    const g = metricTensor(lattice);
    const d = g.data;

    // should have non-zero coupling between a and b
    expect(d[1]).not.toBe(0);
    expect(d[3]).not.toBe(0);

    // symmetry check (metric must be symmetric)
    expect(d[1]).toBe(d[3]);
  });

  it("is symmetric for any lattice", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 1, 0, 0, 3, 1, 0, 0, 4]),
    };

    const g = metricTensor(lattice);

    const d = g.data;

    expect(d[1]).toBeCloseTo(d[3]);
    expect(d[2]).toBeCloseTo(d[6]);
    expect(d[5]).toBeCloseTo(d[7]);
  });
});
