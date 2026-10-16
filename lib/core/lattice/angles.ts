import { dot } from "../matrix/operations/vector/dot";
import { norm } from "../matrix/operations/vector/norm";
import { row } from "../matrix/operations/row";
import { Lattice } from "./lattice";

import { Vector } from "../matrix/vector";

function cosine(u: Vector, v: Vector) {
  const denom = norm(u) * norm(v);
  if (Math.abs(denom) < 1e-300) throw new Error("Zero-length lattice vector");

  return dot(u, v) / denom;
}

/** Compute the cosines of the inter-vector angles (cos α, cos β, cos γ).
 * Use this instead of {@link angles} when the sign matters: cos(acos(0)) is
 * not exactly 0, so round-tripping through radians blurs right angles. */
export function cosines(lattice: Lattice): [number, number, number] {
  const a = row(lattice.basis, 0);
  const b = row(lattice.basis, 1);
  const c = row(lattice.basis, 2);

  return [cosine(b, c), cosine(a, c), cosine(a, b)];
}

/** Compute the three inter-vector angles (alpha, beta, gamma) in radians. */
export function angles(lattice: Lattice): [number, number, number] {
  const acos = (x: number) => Math.acos(Math.max(-1, Math.min(1, x)));
  const [ca, cb, cg] = cosines(lattice);

  return [acos(ca), acos(cb), acos(cg)];
}
