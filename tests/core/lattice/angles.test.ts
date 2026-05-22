import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { angles } from "@/core/lattice/angles";

describe("angles", () => {
  it("returns π/2 for orthogonal cubic lattice", () => {
    const l = {
      basis: createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    };

    const [a, b, c] = angles(l);

    console.log(angles);

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
