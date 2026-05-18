import { createMatrix, Matrix } from "../matrix/matrix";

const EPS = 1e-12;

function clean(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

export interface Lattice {
  readonly basis: Matrix;
}

export function createLattice(data: number[]): Lattice {
  if (data.length !== 9) {
    throw new Error("Lattice requires 9 values (3x3)");
  }

  const cleaned = new Float64Array(9);

  for (let i = 0; i < 9; i++) {
    cleaned[i] = clean(data[i]);
  }

  const basis = createMatrix(3, 3, cleaned);

  return { basis };
}
