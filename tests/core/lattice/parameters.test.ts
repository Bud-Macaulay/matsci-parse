import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { parameters } from "@/core/lattice/parameters";

const PI_2_DEG = 90;

describe("lattice parameters", () => {
  it("returns correct parameters for unit cubic lattice", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    expect(parameters(lattice)).toEqual([
      1,
      1,
      1,
      PI_2_DEG,
      PI_2_DEG,
      PI_2_DEG,
    ]);
  });

  it("correctly reflects scaled orthogonal lattice", () => {
    const lattice = {
      basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    };

    const p = parameters(lattice);

    expect(p[0]).toBe(2);
    expect(p[1]).toBe(3);
    expect(p[2]).toBe(4);

    expect(p[3]).toBeCloseTo(PI_2_DEG);
    expect(p[4]).toBeCloseTo(PI_2_DEG);
    expect(p[5]).toBeCloseTo(PI_2_DEG);
  });

  it("detects shear through non-90 degree angles", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 1, 1, 0, 0, 0, 1]),
    };

    const [, , , alpha, beta, gamma] = parameters(lattice);

    expect(gamma).not.toBeCloseTo(PI_2_DEG);
    expect(Number.isFinite(alpha)).toBe(true);
    expect(Number.isFinite(beta)).toBe(true);
  });

  it("maintains consistency with lengths and angles separately", () => {
    const lattice = {
      basis: createMatrix(3, 3, [3, 0, 0, 0, 4, 0, 0, 0, 5]),
    };

    const [a, b, c, alpha, beta, gamma] = parameters(lattice);

    expect(a).toBe(3);
    expect(b).toBe(4);
    expect(c).toBe(5);

    expect(alpha).toBeCloseTo(PI_2_DEG);
    expect(beta).toBeCloseTo(PI_2_DEG);
    expect(gamma).toBeCloseTo(PI_2_DEG);
  });

  it("is stable under permutation of orthogonal axes", () => {
    const lattice = {
      basis: createMatrix(3, 3, [0, 1, 0, 1, 0, 0, 0, 0, 1]),
    };

    const p = parameters(lattice);

    expect(p.slice(0, 3).sort()).toEqual([1, 1, 1]);
    expect(p.slice(3)).toEqual([PI_2_DEG, PI_2_DEG, PI_2_DEG]);
  });

  it("always returns finite numbers", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 2, 3, 0.1, 0.5, 0.2, 0.3, 0.2, 0.9]),
    };

    const p = parameters(lattice);

    for (const v of p) {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it("has correct tuple length", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    expect(parameters(lattice)).toHaveLength(6);
  });
});
