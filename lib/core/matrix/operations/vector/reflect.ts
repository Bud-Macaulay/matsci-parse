import { Vector } from "../../vector";
import { dot } from "./dot";

const EPS = 1e-12;

export function reflect(v: Vector, n: Vector): Vector {
  const nn = dot(n, n);

  if (nn < EPS) {
    throw new Error("Cannot reflect across zero vector");
  }

  const scale = (2 * dot(v, n)) / nn;

  const out = new Float64Array(v.length);

  for (let i = 0; i < v.length; i++) {
    out[i] = v[i] - scale * n[i];
  }

  return out;
}
