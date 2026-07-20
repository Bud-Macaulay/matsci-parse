import { Matrix, createMatrix } from "../matrix";
import { inverse3x3 } from "./inverse/inverse3x3";

/**
 * Return fractional coordinates (in the original cell) of all lattice points
 * that lie inside the supercell defined by an integer transformation matrix U.
 *
 * The new cell has basis B' = U @ B. A lattice point at integer vector n
 * maps to fractional coordinate inv(U) @ n in the original cell. We collect
 * all n such that inv(U) @ n has every component in [0, 1).
 *
 * The number of returned points equals |det(U)|.
 *
 * @param U - A 3×3 integer transformation matrix.
 * @returns An array of 3-element Float64Arrays, each a fractional coordinate.
 */
export function latticePointsInSupercell(U: Matrix): Float64Array[] {
  const invU = inverse3x3(U);

  // Determine search range: entries of inv(U) scale the integer vectors,
  // so we need to cover enough range.  For typical slab scale factors
  // (entries 0, ±1, ±2), ±4 is ample.
  const maxEntry = Math.max(
    ...Array.from(U.data).map(Math.abs),
    1,
  );
  const range = maxEntry + 2;

  const points: Float64Array[] = [];

  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      for (let k = -range; k <= range; k++) {
        // frac = invU @ [i, j, k]
        const d = invU.data;
        const f0 = d[0] * i + d[1] * j + d[2] * k;
        const f1 = d[3] * i + d[4] * j + d[5] * k;
        const f2 = d[6] * i + d[7] * j + d[8] * k;

        if (
          f0 >= -1e-10 && f0 < 1 - 1e-10 &&
          f1 >= -1e-10 && f1 < 1 - 1e-10 &&
          f2 >= -1e-10 && f2 < 1 - 1e-10
        ) {
          points.push(
            new Float64Array([
              Math.max(0, f0),
              Math.max(0, f1),
              Math.max(0, f2),
            ]),
          );
        }
      }
    }
  }

  return points;
}
