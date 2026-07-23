import { createMatrix, Matrix } from "../matrix/matrix";
import { clean } from "../math/numeric";

/** A lattice defined by a 3x3 basis matrix (row vectors). */
export interface Lattice {
  basis: Matrix;
}

/** Create a Lattice from 3 diagonal lengths, 9 matrix values, or a Matrix. */
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
