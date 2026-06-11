import { fromParameters } from "./fromParameters";

export function tetragonal(a: number, c: number) {
  return fromParameters(a, a, c, 90, 90, 90);
}
