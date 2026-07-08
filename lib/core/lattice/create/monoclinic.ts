import { fromParameters } from "./fromParameters";

/** Create a monoclinic lattice (alpha=gamma=90, beta given in degrees). */
export function monoclinic(a: number, b: number, c: number, beta: number) {
  return fromParameters(a, b, c, 90, beta, 90);
}
