import { EPSILON } from "./constants";

/** Zero-out values within EPSILON of zero. */
export function clean(x: number): number {
  return Math.abs(x) < EPSILON ? 0 : x;
}

/** Wrap a fractional coordinate into [0, 1). Results within `eps` of 0 or 1
 * snap to 0, so values like -1e-14 and 0.99999999 map to the same point.
 * With the default `eps = 0` only an exact 1 (from float rounding of tiny
 * negatives) snaps, which still guarantees the result is < 1. */
export function wrapFrac(x: number, eps = 0): number {
  const v = x - Math.floor(x);
  return v <= eps || v >= 1 - eps ? 0 : v;
}

/** Greatest common divisor. */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/** Least common multiple. */
export function lcm(a: number, b: number): number {
  return (Math.abs(a) / gcd(a, b)) * Math.abs(b);
}
