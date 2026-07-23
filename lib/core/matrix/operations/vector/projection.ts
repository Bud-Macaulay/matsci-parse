import { Vector } from "../../vector";
import { dot } from "./dot";
import { norm } from "./norm";

import { EPSILON } from "../../../math/constants";

/** Compute the scalar projection of a onto b.
 * @param a - Vector to project.
 * @param b - Vector to project onto.
 * @returns The projection vector. */
export function projection(a: Vector, b: Vector): Vector {
  const denom = dot(b, b);

  if (denom < EPSILON) {
    throw new Error("Cannot project onto zero vector");
  }

  const scale = dot(a, b) / denom;

  const out = new Float64Array(b.length);

  for (let i = 0; i < b.length; i++) {
    out[i] = scale * b[i];
  }

  return out;
}
