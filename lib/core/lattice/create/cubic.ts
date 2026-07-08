import { fromParameters } from "./fromParameters";

/** Create a cubic lattice with side length a. */
export function cubic(a: number) {
  return fromParameters(a, a, a, 90, 90, 90);
}
