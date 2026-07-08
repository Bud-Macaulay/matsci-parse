import { describe, it, expect } from "vitest";
import { getAngle } from "@/core/structure/operations/angle/getAngle";
import { createLattice } from "@/core/lattice/lattice";
import { makeStructure } from "../../../../helpers/structure";

describe("getAngle", () => {
  const cubic = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  it("returns 180 degrees for linear configuration", () => {
    const s = makeStructure(cubic, [
      [0, 0, 0],
      [0.5, 0, 0],
      [0.9, 0, 0],
    ]);

    expect(getAngle(s, 0, 1, 2)).toBeCloseTo(180);
  });

  it("returns 90 degrees in orthogonal cubic case", () => {
    const s = makeStructure(cubic, [
      [0, 0, 0],
      [0.9, 0, 0],
      [0, 0.9, 0],
    ]);

    expect(getAngle(s, 1, 0, 2)).toBeCloseTo(90);
  });

  it("is invariant under endpoint permutation", () => {
    const s = makeStructure(cubic, [
      [0, 0, 0],
      [0.9, 0, 0],
      [0, 0.9, 0],
    ]);

    const a1 = getAngle(s, 1, 0, 2);
    const a2 = getAngle(s, 2, 0, 1);

    expect(a1).toBeCloseTo(a2);
  });

  it("applies periodic boundary conditions correctly (wrap)", () => {
    const s = makeStructure(cubic, [
      [0, 0, 0],
      [0.9, 0, 0],
      [0.1, 0, 0],
    ]);

    expect(getAngle(s, 1, 0, 2)).toBeCloseTo(180);
  });

  it("handles 3D diagonal periodic geometry", () => {
    const s = makeStructure(cubic, [
      [0, 0, 0],
      [0.9, 0.9, 0.9],
      [0.1, 0.9, 0.9],
    ]);

    const angle = getAngle(s, 1, 0, 2);

    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(180);
  });

  it("is invariant under full-cell translation", () => {
    const base = makeStructure(cubic, [
      [0.2, 0.3, 0.4],
      [0.8, 0.3, 0.4],
      [0.2, 0.9, 0.4],
    ]);

    const shifted = makeStructure(
      cubic,
      base.sites.map((s) => [
        (s.frac[0] + 1) % 1,
        (s.frac[1] + 1) % 1,
        (s.frac[2] + 1) % 1,
      ]),
    );

    expect(getAngle(base, 1, 0, 2)).toBeCloseTo(getAngle(shifted, 1, 0, 2));
  });

  it("is stable under skewed lattice transformation", () => {
    const lattice = createLattice([1, 0.2, 0, 0, 1, 0.3, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.4, 0.1, 0.1],
      [0.4, 0.4, 0.1],
      [0.4, 0.4, 0.4],
    ]);

    const angle = getAngle(s, 0, 1, 2);

    // Value equivalent to vesta
    expect(angle).toBeCloseTo(101.3099324740202);
  });

  it("handles degenerate collinear sites safely", () => {
    const s = makeStructure(cubic, [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);

    const angle = getAngle(s, 0, 1, 2);

    expect(Number.isFinite(angle)).toBe(true);
  });
});
