import { Matrix } from "../../matrix";
import { dot } from "./dot";
import { norm } from "./norm";

export function angleBetween(a: Matrix, b: Matrix): number {
  const denom = norm(a) * norm(b);

  if (denom === 0) {
    throw new Error("Cannot compute angle with zero vector");
  }

  const cosTheta = dot(a, b) / denom;

  // clamp for numerical stability
  const clamped = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(clamped);
}
