import { Vector } from "../../vector";

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
