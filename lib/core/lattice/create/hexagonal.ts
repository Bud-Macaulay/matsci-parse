import { fromParameters } from "./fromParameters";

export function hexagonal(a: number, c: number) {
  return fromParameters(a, a, c, 90, 90, 120);
}
