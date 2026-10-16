import { Matrix, createMatrix } from "../../matrix";
import { EPSILON } from "../../../math/constants";
import { gjInverse } from "./gaussJordan";
import { inverse2x2 } from "./inverse2x2";
import { inverse3x3 } from "./inverse3x3";
import { inverse4x4 } from "./inverse4x4";

/** Invert a square matrix, dispatching to the closed-form kernels for 1×1–4×4
 * and falling back to Gauss-Jordan for larger sizes.
 * @param m - A square matrix.
 * @returns The inverse Matrix. */
export function inverseSmall(m: Matrix): Matrix {
  if (m.rows !== m.cols) {
    throw new Error("Inverse requires square matrix");
  }

  switch (m.rows) {
    case 1: {
      const a = m.data[0];

      if (Math.abs(a) < EPSILON) {
        throw new Error("Singular matrix");
      }

      return createMatrix(1, 1, [1 / a]);
    }
    case 2:
      return inverse2x2(m);
    case 3:
      return inverse3x3(m);
    case 4:
      return inverse4x4(m);
    default:
      return gjInverse(m);
  }
}
