import { fromParameters } from "./fromParameters";

/** Create a hexagonal lattice with side a and height c. */
export function hexagonal(a: number, c: number) {
  return fromParameters(a, a, c, 90, 90, 120);
}
