import { Vector } from "../../vector";
import { dot } from "./dot";
import { norm } from "./norm";

const EPS = 1e-12;

export function angleBetween(a: Vector, b: Vector): number {
  const na = norm(a);
  const nb = norm(b);

  if (na < EPS || nb < EPS) {
    throw new Error("Cannot compute angle with zero vector");
  }

  const cosTheta = dot(a, b) / (na * nb);

  const clamped = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(clamped);
}
