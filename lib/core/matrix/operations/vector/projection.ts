import { Matrix } from "../../matrix";
import { dot } from "./dot";
import { scale } from "../scale";

export function projection(a: Matrix, b: Matrix): Matrix {
  const denom = dot(b, b);

  if (denom === 0) {
    throw new Error("Cannot project onto zero vector");
  }

  const factor = dot(a, b) / denom;

  return scale(b, factor);
}
