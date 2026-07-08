import { Vector } from "../../vector";

/** Compute the Euclidean distance between two vectors.
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The Euclidean distance. */
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
