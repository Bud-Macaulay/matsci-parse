import { Vector } from "../../vector";

/**
 * Computes the dot product of two vectors.
 *
 * The dot product measures the similarity between two vectors and is fundamental
 * in linear algebra. It represents: a · b = Σ aᵢ × bᵢ
 *
 * @param a - The first vector
 * @param b - The second vector
 * @returns The scalar dot product
 * @throws Error if the vectors have different lengths
 *
 * @remarks
 * - Result is 0 if vectors are perpendicular
 * - Result is positive if vectors point in similar directions
 * - Result is negative if vectors point in opposite directions
 *
 * @example
 * ```typescript
 * const a = new Float64Array([1, 2, 3]) as Vector;
 * const b = new Float64Array([4, 5, 6]) as Vector;
 * const product = dot(a, b);  // 32
 * ```
 */
export function dot(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error("Dot product requires same-length vectors");
  }

  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}
