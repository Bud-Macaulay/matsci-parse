import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { angles, cosines } from "@/core/lattice/angles";

describe("angles", () => {
  it("returns π/2 for orthogonal cubic lattice", () => {
    const l = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    const [a, b, c] = angles(l);

    expect(a).toBeCloseTo(Math.PI / 2);
    expect(b).toBeCloseTo(Math.PI / 2);
    expect(c).toBeCloseTo(Math.PI / 2);
  });
});

describe("angles (non-orthogonal)", () => {
  it("detects skewed geometry", () => {
    const lattice = {
      basis: createMatrix(3, 3, [1, 0, 0, 1, 1, 0, 0, 0, 1]),
    };

    const [alpha, beta, gamma] = angles(lattice);

    // one angle should deviate from 90°
    expect(gamma).not.toBeCloseTo(Math.PI / 2);

    expect(Number.isFinite(alpha)).toBe(true);
    expect(Number.isFinite(beta)).toBe(true);
    expect(Number.isFinite(gamma)).toBe(true);
  });
});

describe("cosines", () => {
  it("returns exactly 0 for an orthorhombic cell", () => {
    const l = { basis: createMatrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]) };

    expect(cosines(l)).toEqual([0, 0, 0]);
  });

  it("returns cos β for a monoclinic cell (β = 105°)", () => {
    const beta = (105 * Math.PI) / 180;
    const l = {
      basis: createMatrix(3, 3, [
        4,
        0,
        0,
        0,
        5,
        0,
        6 * Math.cos(beta),
        0,
        6 * Math.sin(beta),
      ]),
    };
    const [ca, cb, cg] = cosines(l);

    expect(ca).toBe(0);
    expect(cb).toBeCloseTo(Math.cos(beta), 12);
    expect(cg).toBe(0);
  });

  it("is consistent with angles", () => {
    const l = { basis: createMatrix(3, 3, [4, 0, 0, 1, 5, 0, 0.5, 0.7, 6]) };
    const cos = cosines(l);
    const ang = angles(l);

    for (let i = 0; i < 3; i++) expect(Math.cos(ang[i])).toBeCloseTo(cos[i], 12);
  });

  it("throws on a zero-length lattice vector", () => {
    const l = { basis: createMatrix(3, 3, [0, 0, 0, 0, 1, 0, 0, 0, 1]) };

    expect(() => cosines(l)).toThrow("Zero-length lattice vector");
  });
});
