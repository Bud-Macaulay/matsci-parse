import { EPSILON } from "./constants";

/** Zero-out values within EPSILON of zero. */
export function clean(x: number): number {
  return Math.abs(x) < EPSILON ? 0 : x;
}

/** Greatest common divisor. */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Least common multiple. */
export function lcm(a: number, b: number): number {
  return (Math.abs(a) / gcd(a, b)) * Math.abs(b);
}
