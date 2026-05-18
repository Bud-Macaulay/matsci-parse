import { fromParameters } from "./fromParameters";

export function monoclinic(a: number, b: number, c: number, beta: number) {
  return fromParameters(a, b, c, 90, beta, 90);
}
