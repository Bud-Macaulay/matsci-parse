import { createMatrix, Matrix } from "../matrix/matrix";

const EPS = 1e-12;

function clean(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

export interface Lattice {
  basis: Matrix;
}

export function createLattice(
  data: number[] | Float64Array | Matrix | [number, number, number],
): Lattice {
  const values =
    data instanceof Float64Array
      ? Array.from(data)
      : "data" in data
        ? Array.from(data.data)
        : data;

  let m: Float64Array;

  if (values.length === 3) {
    const [a, b, c] = values;

    m = new Float64Array([a, 0, 0, 0, b, 0, 0, 0, c]);
  } else if (values.length === 9) {
    m = new Float64Array(9);

    for (let i = 0; i < 9; i++) {
      m[i] = clean(values[i]);
    }
  } else {
    throw new Error("Lattice requires 3 or 9 values");
  }

  return {
    basis: createMatrix(3, 3, m),
  };
}
