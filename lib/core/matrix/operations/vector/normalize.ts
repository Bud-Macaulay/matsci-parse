import { Matrix } from "../../matrix";
import { norm } from "./norm";
import { scale } from "../scale";

export function normalize(v: Matrix): Matrix {
  const n = norm(v);

  if (n === 0) {
    throw new Error("Cannot normalize zero vector");
  }

  return scale(v, 1 / n);
}
