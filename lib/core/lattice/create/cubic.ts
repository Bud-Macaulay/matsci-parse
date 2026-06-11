import { fromParameters } from "./fromParameters";

export function cubic(a: number) {
  return fromParameters(a, a, a, 90, 90, 90);
}
