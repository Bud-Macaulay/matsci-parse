import { Matrix } from "../matrix";
import { scale } from "./scale";

/**
 * Negates a matrix by multiplying all elements by -1.
 *
 * Returns a new matrix where each element is negated.
 *
 * @param m - The matrix to negate
 * @returns A new matrix with all elements negated
 *
 * @example
 * ```typescript
 * const m = createMatrix(2, 2, [1, -2, 3, -4]);
 * const result = negate(m);  // [[-1, 2], [-3, 4]]
 * ```
 */
export function negate(m: Matrix): Matrix {
  return scale(m, -1);
}
