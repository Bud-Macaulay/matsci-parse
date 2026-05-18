import { fromParameters } from "./fromParameters";

export function rhombohedral(a: number, alpha: number) {
  return fromParameters(a, a, a, alpha, alpha, alpha);
}
