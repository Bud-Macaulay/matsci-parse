import { createMatrix } from "../../matrix/matrix";
import { solve } from "../../matrix/operations/solve";

// NOTE: The algorithm here could be extracted out into the matrix lib as a generic leastSquares if ever needed.

/**
 * Least-squares polynomial fit y ≈ Σₖ cₖ·xᵏ, solved by the normal equations
 * (VᵀV)·t = Vᵀy of the Vandermonde matrix V, accumulated in one pass as
 * power sums (V itself is never built). The abscissae are centred and
 * scaled to [−1, 1] first, which keeps VᵀV well conditioned for the low
 * degrees this is meant for; the returned coefficients refer to the
 * original x.
 *
 * @param x - Sample abscissae.
 * @param y - Sample ordinates (same length as x).
 * @param degree - Polynomial degree d (needs at least d + 1 distinct x).
 * @throws If the lengths differ, the degree is invalid, or there are fewer
 *   than d + 1 distinct x.
 * @returns Coefficients in ascending order [c₀, c₁, …, c_d] (note: the
 *   reverse of numpy.polyfit).
 */
export function polyfit(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  degree: number,
): Float64Array {
  const m = x.length;

  if (y.length !== m) {
    throw new Error("polyfit: x and y must have the same length");
  }

  if (!Number.isInteger(degree) || degree < 0) {
    throw new Error("polyfit: degree must be a non-negative integer");
  }

  const n = degree + 1;
  // Stops once n distinct values are found, so this stays O(m·n).
  const distinct: number[] = [];

  for (let i = 0; i < m && distinct.length < n; i++) {
    if (!distinct.includes(x[i])) distinct.push(x[i]);
  }

  if (distinct.length < n) {
    throw new Error(
      `polyfit: degree ${degree} needs at least ${n} distinct x values`,
    );
  }

  let lo = Infinity;
  let hi = -Infinity;

  for (let i = 0; i < m; i++) {
    lo = Math.min(lo, x[i]);
    hi = Math.max(hi, x[i]);
  }

  const shift = 0.5 * (lo + hi);
  const half = 0.5 * (hi - lo) || 1;

  // Accumulate the normal equations without forming the m×n Vandermonde
  // matrix V: with u = (x − s)/h, (VᵀV)ⱼₖ = Σ u^(j+k) and (Vᵀy)ⱼ = Σ y·uʲ.
  const powerSums = new Float64Array(2 * n - 1);
  const rhs = new Float64Array(n);

  for (let i = 0; i < m; i++) {
    const u = (x[i] - shift) / half;
    let p = 1;

    for (let k = 0; k < 2 * n - 1; k++) {
      powerSums[k] += p;
      if (k < n) rhs[k] += y[i] * p;
      p *= u;
    }
  }

  // VᵀV is the Hankel matrix of the power sums.
  const normal = createMatrix(n, n);

  for (let j = 0; j < n; j++) {
    for (let k = 0; k < n; k++) normal.data[j * n + k] = powerSums[j + k];
  }

  const t = solve(normal, rhs);

  // Expand Σ tₖ·((x − s)/h)ᵏ into powers of x (binomial theorem).
  const out = new Float64Array(n);

  for (let k = 0; k < n; k++) {
    const ck = t[k] / half ** k;
    let binom = 1;

    for (let j = 0; j <= k; j++) {
      out[j] += ck * binom * (-shift) ** (k - j);
      binom = (binom * (k - j)) / (j + 1);
    }
  }

  return out;
}

/** Evaluate a polynomial with ascending coefficients by Horner's rule.
 * @param coefficients - [c₀, c₁, …, c_d].
 * @param x - Abscissa.
 * @returns Σₖ cₖ·xᵏ. */
export function polyval(coefficients: ArrayLike<number>, x: number): number {
  let y = 0;

  for (let k = coefficients.length - 1; k >= 0; k--) {
    y = y * x + coefficients[k];
  }

  return y;
}
