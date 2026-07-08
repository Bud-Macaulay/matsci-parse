import { fromParameters } from "./fromParameters";

/** Create an orthorhombic lattice with sides a, b, c and all angles 90. */
export function orthorhombic(a: number, b: number, c: number) {
  return fromParameters(a, b, c, 90, 90, 90);
}
