import { Matrix } from "../matrix";
import { scale } from "./scale";

export function negate(m: Matrix): Matrix {
  return scale(m, -1);
}
