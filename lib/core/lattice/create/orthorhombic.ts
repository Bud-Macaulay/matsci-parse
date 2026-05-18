import { fromParameters } from "./fromParameters";

export function orthorhombic(a: number, b: number, c: number) {
  return fromParameters(a, b, c, 90, 90, 90);
}
