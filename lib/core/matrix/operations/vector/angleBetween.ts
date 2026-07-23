import { Vector } from "../../vector";
import { dot } from "./dot";
import { norm } from "./norm";

import { EPSILON } from "../../../math/constants";

/** Compute the angle in radians between two vectors.
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The angle in radians. */
export function angleBetween(a: Vector, b: Vector): number {
  const na = norm(a);
  const nb = norm(b);

  if (na < EPSILON || nb < EPSILON) {
    throw new Error("Cannot compute angle with zero vector");
  }

  const cosTheta = dot(a, b) / (na * nb);

  const clamped = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(clamped);
}
