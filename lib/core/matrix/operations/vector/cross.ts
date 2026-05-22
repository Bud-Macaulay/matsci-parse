import { Vector } from "../../vector";

/**
 * Computes the cross product of two 3D vectors.
 *
 * The cross product produces a vector perpendicular to both input vectors,
 * with magnitude equal to the area of the parallelogram they span.
 *
 * @param a - The first 3D vector
 * @param b - The second 3D vector
 * @returns A new 3D vector representing the cross product
 * @throws Error if either vector is not 3-dimensional
 *
 * @remarks
 * - Only defined for 3D vectors
 * - Result is perpendicular to both inputs (right-hand rule)
 * - Magnitude: ‖a × b‖ = ‖a‖ ‖b‖ sin(θ)
 * - Cross product is anti-commutative: a × b = -(b × a)
 *
 * @example
 * ```typescript
 * const a = new Float64Array([1, 0, 0]) as Vector;
 * const b = new Float64Array([0, 1, 0]) as Vector;
 * const result = cross(a, b);  // [0, 0, 1]
 * ```
 */
export function cross(a: Vector, b: Vector): Vector {
  if (a.length !== 3 || b.length !== 3) {
    throw new Error("Cross product requires 3D vectors");
  }

  return new Float64Array([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]);
}
