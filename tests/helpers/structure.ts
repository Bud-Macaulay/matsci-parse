import { createLattice } from "@/core/lattice/lattice";

export function evalPlane(
  eq: { a: number; b: number; c: number; d: number },
  point: Float64Array,
) {
  return eq.a * point[0] + eq.b * point[1] + eq.c * point[2] + eq.d;
}

export function makeStructure(lattice: any, fracs: number[][]) {
  return {
    lattice,
    sites: fracs.map((f) => ({
      species: { symbol: "A" },
      frac: new Float64Array(f),
    })),
  };
}

export function cubicStructure() {
  return {
    lattice: createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    sites: [],
  };
}
