import { Vector } from "../../vector";

/** Compute the dot product of two vectors.
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The dot product. */
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
