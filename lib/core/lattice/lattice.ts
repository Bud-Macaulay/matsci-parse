import { createMatrix, Matrix } from "../matrix/matrix";

const EPS = 1e-12;

function clean(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

/**
 * Represents a crystallographic lattice with a 3x3 basis matrix.
 *
 * @remarks
 * The basis matrix contains three lattice vectors as rows:
 * - Row 0: First lattice vector **a**
 * - Row 1: Second lattice vector **b**
 * - Row 2: Third lattice vector **c**
 *
 * This representation is compatible with standard crystallographic conventions.
 */
export interface Lattice {
  readonly basis: Matrix;
}

/**
 * Creates a Lattice from a 3x3 basis matrix.
 *
 * @param data - Either a flat array of 9 numbers or a 3x3 Matrix representing the lattice basis vectors.
 *               The values should be organized as [a1, a2, a3, b1, b2, b3, c1, c2, c3]
 *               where a, b, c are the three lattice vectors.
 *
 * @returns A new Lattice object with the provided basis matrix.
 *
 * @throws Will throw an error if the data does not contain exactly 9 elements.
 *
 * @remarks
 * - Very small values (< 1e-12 in magnitude) are automatically cleaned to zero
 * - The function accepts either a flat array or a Matrix object
 *
 * @example
 * ```typescript
 * // Create a cubic lattice with edge length 5 Ångströms
 * const lattice = createLattice([
 *   5, 0, 0,
 *   0, 5, 0,
 *   0, 0, 5
 * ]);
 * ```
 */
export function createLattice(data: number[] | Float64Array | Matrix): Lattice {
  const values =
    data instanceof Float64Array ? data : "data" in data ? data.data : data;

  if (values.length !== 9) {
    throw new Error("Lattice requires 9 values (3x3)");
  }

  const cleaned = new Float64Array(9);

  for (let i = 0; i < 9; i++) {
    cleaned[i] = clean(values[i]);
  }

  return {
    basis: createMatrix(3, 3, cleaned),
  };
}
