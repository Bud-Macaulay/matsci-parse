import { Vector } from "../../vector";

/**
 * Computes the Euclidean distance between two points represented as vectors.
 *
 * Distance is computed as: d(a, b) = √(Σ (bᵢ - aᵢ)²)
 *
 * @param a - The first point vector
 * @param b - The second point vector
 * @returns The Euclidean distance between the points
 * @throws Error if the vectors have different lengths
 *
 * @remarks
 * - Distance is always non-negative
 * - Distance is symmetric: d(a, b) = d(b, a)
 * - Used in clustering, nearest neighbor, and metric calculations
 *
 * @example
 * ```typescript
 * const p1 = new Float64Array([0, 0, 0]) as Vector;
 * const p2 = new Float64Array([3, 4, 0]) as Vector;
 * const d = distance(p1, p2);  // 5
 * ```
 */
export function distance(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    const d = b[i] - a[i];
    sum += d * d;
  }

  return Math.sqrt(sum);
}
