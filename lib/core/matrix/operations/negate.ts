import { Matrix } from "../matrix";
import { scale } from "./scale";

/** Negate all elements of matrix m.
 * @param m - Input matrix.
 * @returns A new negated Matrix. */
export function negate(m: Matrix): Matrix {
  return scale(m, -1);
}
