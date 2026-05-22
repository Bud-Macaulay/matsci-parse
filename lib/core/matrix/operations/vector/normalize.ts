import { Vector } from "../../vector";
import { norm } from "./norm";

const EPS = 1e-12;

/**
 * Normalizes a vector to unit length (norm = 1).
 *
 * Returns a new vector pointing in the same direction with magnitude 1.
 *
 * @param v - The vector to normalize
 * @returns A new normalized unit vector
 * @throws Error if the vector is zero or near-zero (norm < 1e-12)
 *
 * @remarks
 * - Used extensively in graphics, physics, and geometry
 * - Normalized vectors preserve direction while standardizing magnitude
 * - Cannot normalize zero vector (would cause division by zero)
 *
 * @example
 * ```typescript
 * const v = new Float64Array([3, 4]) as Vector;
 * const u = normalize(v);  // [0.6, 0.8]
 * ```
 */
export function normalize(v: Vector): Vector {
  const n = norm(v);

  if (n < EPS) {
    throw new Error("Cannot normalize zero vector");
  }

  const out = new Float64Array(v.length);

  for (let i = 0; i < v.length; i++) {
    out[i] = v[i] / n;
  }

  return out;
}
