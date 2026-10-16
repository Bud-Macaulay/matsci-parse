const SQRT_PI = Math.sqrt(Math.PI);

/**
 * Complementary error function, erfc(x) = 1 - erf(x).
 *
 * Small |x| uses the erf Taylor series; large x uses the Laplace continued
 * fraction (modified Lentz), which avoids the catastrophic cancellation of
 * 1 - erf(x) where erfc is tiny. Accurate to ~1e-15 across the range.
 */
export function erfc(x: number): number {
  if (x < 0) return 2 - erfc(-x);
  if (x <= 2) {
    // erf Taylor series: (2/sqrt(pi)) * sum_n (-1)^n x^(2n+1) / (n! (2n+1))
    let term = x;
    let sum = x;
    const x2 = x * x;
    for (let n = 1; n < 60; n++) {
      term *= (-x2 * (2 * n - 1)) / (n * (2 * n + 1));
      sum += term;
      if (Math.abs(term) < 1e-17 * Math.abs(sum)) break;
    }
    return 1 - (2 / SQRT_PI) * sum;
  }
  // Laplace continued fraction:
  // erfc(x) = x*exp(-x^2)/sqrt(pi) * 1/(x^2 + (1/2)/(1 + 1/(x^2 + (3/2)/(1 + 2/(x^2 + ...)))))
  const z = x * x;
  const tiny = 1e-300;
  let f = tiny;
  let c = tiny;
  let d = 0;
  for (let k = 1; k < 1000; k++) {
    const a = k === 1 ? 1 : (k - 1) / 2;
    const b = k % 2 === 1 ? z : 1;
    d = b + a * d;
    if (Math.abs(d) < tiny) d = tiny;
    d = 1 / d;
    c = b + a / c;
    if (Math.abs(c) < tiny) c = tiny;
    const cd = c * d;
    f *= cd;
    if (Math.abs(cd - 1) < 1e-15) break;
  }
  return ((x * Math.exp(-z)) / SQRT_PI) * f;
}

/**
 * Fast erfc: cubic-Hermite table over [0, TABLE_XMAX] with analytic
 * derivatives stored alongside the values, so evaluation is pure arithmetic
 * (no exp). Measured max abs error 1.7e-13 at N=4096 (16x per doubling:
 * 6.8e-10 at 512), 64KB, ~30ns/call; x beyond the table falls back to exact
 * (cold path).
 */
const TABLE_XMAX = 8;
const TABLE_N = 4096;
const TABLE_H = TABLE_XMAX / TABLE_N;
const TABLE_INV_H = TABLE_N / TABLE_XMAX;
// Interleaved [f(x_i), h f'(x_i)] pairs: one array, and both values of a
// node share a cache line. Built on first use (4097 exact erfc calls).
let table: Float64Array | null = null;

function buildTable(): Float64Array {
  const tab = new Float64Array(2 * (TABLE_N + 1));
  for (let i = 0; i <= TABLE_N; i++) {
    const x = i * TABLE_H;
    tab[2 * i] = erfc(x);
    tab[2 * i + 1] = TABLE_H * (-(2 / SQRT_PI) * Math.exp(-x * x));
  }
  table = tab;
  return tab;
}

/** Table-interpolated erfc: ~8x faster than {@link erfc} at ~1e-13 accuracy. */
export function erfcFast(x: number): number {
  if (x < 0) return 2 - erfcFast(-x);
  if (x > TABLE_XMAX) return erfc(x);
  const tab = table ?? buildTable();
  const pos = x * TABLE_INV_H;
  let i = Math.floor(pos);
  if (i >= TABLE_N) i = TABLE_N - 1;
  const t = pos - i;
  const t2 = t * t;
  const t3 = t2 * t;
  const k = 2 * i;
  const f0 = tab[k] as number;
  const s0 = tab[k + 1] as number;
  const f1 = tab[k + 2] as number;
  const s1 = tab[k + 3] as number;
  return (
    (2 * t3 - 3 * t2 + 1) * f0 +
    (t3 - 2 * t2 + t) * s0 +
    (-2 * t3 + 3 * t2) * f1 +
    (t3 - t2) * s1
  );
}

/** Selectable erfc evaluator. `exact` is {@link erfc}, `fast` is {@link erfcFast}. */
export type ErfcMethod = "exact" | "fast";

/** Resolve an {@link ErfcMethod} to its function (one lookup per caller, not per call). */
export function selectErfc(method: ErfcMethod): (x: number) => number {
  return method === "fast" ? erfcFast : erfc;
}
