import { fromParameters } from "./fromParameters";

/** Create a rhombohedral lattice with side a and equal angles alpha (degrees). */
export function rhombohedral(a: number, alpha: number) {
  return fromParameters(a, a, a, alpha, alpha, alpha);
}
