import { Vector } from "../../vector";

/** Compute the Euclidean norm (magnitude) of a vector.
 * @param v - Input vector.
 * @returns The Euclidean norm. */
export function norm(v: Vector): number {
  let sum = 0;

  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    sum += x * x;
  }

  return Math.sqrt(sum);
}
