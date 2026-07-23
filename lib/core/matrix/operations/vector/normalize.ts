import { Vector } from "../../vector";
import { norm } from "./norm";

import { EPSILON } from "../../../math/constants";

/** Return a unit vector in the direction of v.
 * @param v - Input vector.
 * @returns A normalized unit vector. */
export function normalize(v: Vector): Vector {
  const n = norm(v);

  if (n < EPSILON) {
    throw new Error("Cannot normalize zero vector");
  }

  const out = new Float64Array(v.length);

  for (let i = 0; i < v.length; i++) {
    out[i] = v[i] / n;
  }

  return out;
}
