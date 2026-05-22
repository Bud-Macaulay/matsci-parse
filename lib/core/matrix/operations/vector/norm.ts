import { Vector } from "../../vector";

const EPS = 1e-12;

/**
 * Computes the Euclidean norm (L2 norm) of a vector.
 *
 * The norm represents the magnitude or length of the vector:
 * ‖v‖ = √(Σ vᵢ²)
 *
 * @param v - The vector
 * @returns The norm value (always non-negative)
 *
 * @remarks
 * - A norm of 0 indicates a zero vector
 * - Used in convergence tests, error metrics, and normalization
 * - Also known as the Euclidean distance from origin
 *
 * @example
 * ```typescript
 * const v = new Float64Array([3, 4]) as Vector;
 * const n = norm(v);  // 5
 * ```
 */
export function norm(v: Vector): number {
  let sum = 0;

  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    sum += x * x;
  }

  return Math.sqrt(sum);
}
