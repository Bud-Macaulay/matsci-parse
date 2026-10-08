import { Matrix } from "../matrix";
import { inverse3x3 } from "./inverse/inverse3x3";

/**
 * Return fractional coordinates (in the new/supercell) of all lattice points
 * that lie inside the supercell defined by an integer transformation matrix U.
 *
 * The new cell has basis B' = U @ B (rows are lattice vectors). An old-lattice
 * translation t = m_row @ B (m integer) has new-cell fractional coordinate
 * g = U⁻ᵀ @ m, since B'ᵀ @ g = Bᵀ @ m. We collect all integer m such that
 * g has every component in [0, 1).
 *
 * The number of returned points equals |det(U)|.
 *
 * @param U - A 3×3 integer transformation matrix (non-singular).
 * @returns An array of 3-element Float64Arrays, each a fractional coordinate
 *   in the new cell.
 */
export function latticePointsInSupercell(U: Matrix): Float64Array[] {
  if (U.rows !== 3 || U.cols !== 3) {
    throw new Error(
      `latticePointsInSupercell requires a 3×3 matrix, got ${U.rows}×${U.cols}`,
    );
  }

  for (let i = 0; i < 9; i++) {
    if (Math.abs(U.data[i] - Math.round(U.data[i])) > 1e-8) {
      throw new Error(
        `latticePointsInSupercell requires an integer matrix, got entry ${U.data[i]} at index ${i}`,
      );
    }
  }

  // Throws on singular U.
  const invU = inverse3x3(U);

  // Search bounds: m = Uᵀ @ g with g ∈ [0,1)³, so
  // |m_i| <= Σ_j |U_ji| (column sums of U).
  const rx = Math.ceil(
    Math.abs(U.data[0]) + Math.abs(U.data[3]) + Math.abs(U.data[6]),
  );
  const ry = Math.ceil(
    Math.abs(U.data[1]) + Math.abs(U.data[4]) + Math.abs(U.data[7]),
  );
  const rz = Math.ceil(
    Math.abs(U.data[2]) + Math.abs(U.data[5]) + Math.abs(U.data[8]),
  );

  const volume = (2 * rx + 1) * (2 * ry + 1) * (2 * rz + 1);
  if (volume > 20_000_000) {
    throw new Error(
      `latticePointsInSupercell search box too large (${2 * rx + 1}×${2 * ry + 1}×${2 * rz + 1}); ` +
        `transformation entries are too big`,
    );
  }

  const points: Float64Array[] = [];

  // g = U⁻ᵀ @ m. invU.data is row-major U⁻¹, so U⁻ᵀ entries are transposed:
  // g0 = d[0]*i + d[3]*j + d[6]*k, etc.
  const d = invU.data;

  for (let i = -rx; i <= rx; i++) {
    for (let j = -ry; j <= ry; j++) {
      for (let k = -rz; k <= rz; k++) {
        // frac = invUᵀ @ [i, j, k]
        const f0 = d[0] * i + d[3] * j + d[6] * k;
        const f1 = d[1] * i + d[4] * j + d[7] * k;
        const f2 = d[2] * i + d[5] * j + d[8] * k;

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
