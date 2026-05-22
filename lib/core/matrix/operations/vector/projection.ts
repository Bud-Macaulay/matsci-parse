import { Vector } from "../../vector";
import { dot } from "./dot";
import { norm } from "./norm";

const EPS = 1e-12;

/**
 * Computes the orthogonal projection of one vector onto another.
 *
 * Returns the component of vector a that lies in the direction of vector b:
 * proj_b(a) = ((a · b) / (b · b)) × b
 *
 * @param a - The vector to project
 * @param b - The vector to project onto
 * @returns A new vector representing the projection of a onto b
 * @throws Error if vector b is zero or near-zero
 *
 * @remarks
 * - Used in Gram-Schmidt orthogonalization and QR decomposition
 * - Result is parallel to b
 * - If θ is the angle between a and b: ‖proj_b(a)‖ = ‖a‖ cos(θ)
 *
 * @example
 * ```typescript
 * const a = new Float64Array([3, 4]) as Vector;
 * const b = new Float64Array([1, 0]) as Vector;
 * const proj = projection(a, b);  // [3, 0]
 * ```
 */
export function projection(a: Vector, b: Vector): Vector {
  const denom = dot(b, b);

  if (denom < EPS) {
    throw new Error("Cannot project onto zero vector");
  }

  const scale = dot(a, b) / denom;

  const out = new Float64Array(b.length);

  for (let i = 0; i < b.length; i++) {
    out[i] = scale * b[i];
  }

  return out;
}
