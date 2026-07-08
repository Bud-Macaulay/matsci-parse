import { fromParameters } from "./fromParameters";

/** Create a tetragonal lattice with a=b, c, and all angles 90. */
export function tetragonal(a: number, c: number) {
  return fromParameters(a, a, c, 90, 90, 90);
}
