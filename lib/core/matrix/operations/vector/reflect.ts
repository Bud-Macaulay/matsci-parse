import { Matrix } from "../../matrix";
import { dot } from "./dot";
import { scale } from "../scale";
import { sub } from "../sub";

export function reflect(v: Matrix, n: Matrix): Matrix {
  const denom = dot(n, n);

  if (denom === 0) {
    throw new Error("Cannot reflect across zero vector");
  }

  const factor = (2 * dot(v, n)) / denom;

  return sub(v, scale(n, factor));
}
