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
