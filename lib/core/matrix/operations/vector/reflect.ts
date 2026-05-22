import { Vector } from "../../vector";
import { dot } from "./dot";

const EPS = 1e-12;

/**
 * Reflects a vector across a surface defined by a normal vector.
 *
 * Computes the reflection: r = v - 2(v · n / n · n) × n
 *
 * @param v - The vector to reflect
 * @param n - The surface normal vector
 * @returns A new reflected vector
 * @throws Error if the normal vector is zero or near-zero
 *
 * @remarks
 * - Used in ray tracing, physics simulations, and graphics
 * - The normal vector should ideally be a unit vector for standard reflection
 * - Reflection preserves vector magnitude
 * - If v is parallel to n, reflection is -v
 *
 * @example
 * ```typescript
 * const incident = new Float64Array([1, -1]) as Vector;
 * const normal = new Float64Array([0, 1]) as Vector;
 * const reflected = reflect(incident, normal);  // [1, 1]
 * ```
 */
export function reflect(v: Vector, n: Vector): Vector {
  const nn = dot(n, n);

  if (nn < EPS) {
    throw new Error("Cannot reflect across zero vector");
  }

  const scale = (2 * dot(v, n)) / nn;

  const out = new Float64Array(v.length);

  for (let i = 0; i < v.length; i++) {
    out[i] = v[i] - scale * n[i];
  }

  return out;
}
