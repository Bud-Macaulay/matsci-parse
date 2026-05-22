import { Vector } from "../../vector";
import { dot } from "./dot";
import { norm } from "./norm";

const EPS = 1e-12;

/**
 * Computes the angle between two vectors in radians.
 *
 * The angle is computed using the formula: θ = arccos((a · b) / (‖a‖ ‖b‖))
 *
 * @param a - The first vector
 * @param b - The second vector
 * @returns The angle in radians (0 to π)
 * @throws Error if either vector is zero or near-zero
 *
 * @remarks
 * - Result is in range [0, π]
 * - Angle is 0 when vectors point in same direction
 * - Angle is π/2 when vectors are perpendicular
 * - Angle is π when vectors point in opposite directions
 * - Uses clamping to handle numerical precision issues
 *
 * @example
 * ```typescript
 * const a = new Float64Array([1, 0]) as Vector;
 * const b = new Float64Array([0, 1]) as Vector;
 * const angle = angleBetween(a, b);  // π/2 (90 degrees)
 * ```
 */
export function angleBetween(a: Vector, b: Vector): number {
  const na = norm(a);
  const nb = norm(b);

  if (na < EPS || nb < EPS) {
    throw new Error("Cannot compute angle with zero vector");
  }

  const cosTheta = dot(a, b) / (na * nb);

  const clamped = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(clamped);
}
