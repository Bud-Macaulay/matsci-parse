import { dot } from "../matrix/operations/vector/dot";
import { norm } from "../matrix/operations/vector/norm";
import { Lattice } from "./lattice";

import { Vector } from "../matrix/vector";

function angle(u: Vector, v: Vector) {
  const denom = norm(u) * norm(v);
  if (denom === 0) throw new Error("Zero-length lattice vector");

  const c = dot(u, v) / denom;
  const clamped = Math.max(-1, Math.min(1, c));

  return Math.acos(clamped);
}

export function angles(lattice: Lattice): [number, number, number] {
  const m = lattice.basis.data;

  const a: Vector = new Float64Array([m[0], m[1], m[2]]);
  const b: Vector = new Float64Array([m[3], m[4], m[5]]);
  const c: Vector = new Float64Array([m[6], m[7], m[8]]);

  const alpha = angle(b, c);
  const beta = angle(a, c);
  const gamma = angle(a, b);

  return [alpha, beta, gamma];
}
