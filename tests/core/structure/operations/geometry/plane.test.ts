import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import {
  planeFromSites,
  planeEquation,
} from "@/core/structure/operations/geometry/plane";

function evalPlane(
  eq: { a: number; b: number; c: number; d: number },
  point: Float64Array,
) {
  return eq.a * point[0] + eq.b * point[1] + eq.c * point[2] + eq.d;
}

function makeStructure(lattice: any, fracs: number[][]) {
  return {
    lattice,
    sites: fracs.map((f) => ({
      species: { symbol: "A" },
      frac: new Float64Array(f),
    })),
  };
}

describe("planeFromSites", () => {
  it("computes a valid normal for orthogonal geometry", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0, 0, 0],
      [0.1, 0, 0],
      [0, 0.1, 0],
    ]);

    const plane = planeFromSites(s, 0, 1, 2);

    expect(plane.normal[0]).toBeCloseTo(0);
    expect(plane.normal[1]).toBeCloseTo(0);
    expect(Math.abs(plane.normal[2])).toBeCloseTo(1);
  });

  it("is invariant under translation in fractional space", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const base = makeStructure(lattice, [
      [0.2, 0.3, 0.4],
      [0.7, 0.3, 0.4],
      [0.2, 0.8, 0.4],
    ]);

    const shifted = makeStructure(lattice, [
      [1.2 % 1, 1.3 % 1, 1.4 % 1],
      [1.7 % 1, 1.3 % 1, 1.4 % 1],
      [1.2 % 1, 1.8 % 1, 1.4 % 1],
    ]);

    const p1 = planeFromSites(base, 0, 1, 2);
    const p2 = planeFromSites(shifted, 0, 1, 2);

    // planes are ambigious so therefore signs may flip on vectors
    const dot =
      p1.normal[0] * p2.normal[0] +
      p1.normal[1] * p2.normal[1] +
      p1.normal[2] * p2.normal[2];
    expect(Math.abs(dot)).toBeCloseTo(1, 6);
  });

  it("handles skewed lattice consistently", () => {
    const lattice = createLattice([1, 0.3, 0.2, 0, 1, 0.4, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.5, 0.1, 0.1],
      [0.5, 0.5, 0.1],
    ]);

    const plane = planeFromSites(s, 0, 1, 2);

    // normal should still be unit length
    const norm = Math.sqrt(
      plane.normal[0] ** 2 + plane.normal[1] ** 2 + plane.normal[2] ** 2,
    );

    expect(norm).toBeCloseTo(1, 6);
  });

  it("returns zero normal for collinear points", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0, 0, 0],
      [0.5, 0, 0],
      [1.0, 0, 0],
    ]);

    const plane = planeFromSites(s, 0, 1, 2);

    expect(plane.normal[0]).toBe(0);
    expect(plane.normal[1]).toBe(0);
    expect(plane.normal[2]).toBe(0);
  });

  it("is stable under periodic wrap", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.9, 0.1, 0.1],
      [0.1, 0.9, 0.1],
    ]);

    const plane = planeFromSites(s, 0, 1, 2);

    expect(plane.normal[2]).toBeCloseTo(1);
  });
});

describe("planeEquation", () => {
  it("produces a plane containing the reference point", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]);

    const plane = planeFromSites(s, 0, 1, 2);
    const eq = planeEquation(plane);

    expect(evalPlane(eq, plane.point)).toBeCloseTo(0, 12);
  });

  it("gives z = 0 plane for xy-plane points", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0, 0, 0],
      [0.5, 0, 0],
      [0, 0.5, 0],
    ]);

    const eq = planeEquation(planeFromSites(s, 0, 1, 2));

    expect(Math.abs(eq.a)).toBeCloseTo(0, 12);
    expect(Math.abs(eq.b)).toBeCloseTo(0, 12);
    expect(Math.abs(eq.c)).toBeCloseTo(1, 12);
    expect(eq.d).toBeCloseTo(0, 12);
  });

  it("all defining sites satisfy the plane equation", () => {
    const lattice = createLattice([1, 0.2, 0, 0, 1, 0.3, 0, 0, 1]);

    const s = makeStructure(lattice, [
      [0.1, 0.1, 0.1],
      [0.4, 0.1, 0.1],
      [0.4, 0.4, 0.1],
    ]);

    const plane = planeFromSites(s, 0, 1, 2);
    const eq = planeEquation(plane);

    const p0 = plane.point;

    expect(evalPlane(eq, p0)).toBeCloseTo(0, 12);
  });

  it("is invariant under whole-cell translation", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    const base = makeStructure(lattice, [
      [0.2, 0.3, 0.4],
      [0.7, 0.3, 0.4],
      [0.2, 0.8, 0.4],
    ]);

    const shifted = makeStructure(lattice, [
      [1.2 % 1, 1.3 % 1, 1.4 % 1],
      [1.7 % 1, 1.3 % 1, 1.4 % 1],
      [1.2 % 1, 1.8 % 1, 1.4 % 1],
    ]);

    const eq1 = planeEquation(planeFromSites(base, 0, 1, 2));
    const eq2 = planeEquation(planeFromSites(shifted, 0, 1, 2));

    const dot = eq1.a * eq2.a + eq1.b * eq2.b + eq1.c * eq2.c;

    expect(Math.abs(dot)).toBeCloseTo(1, 6);
  });
});
