/** A 3-component vector. */
export type Vec3 = Float64Array;

// TODO: these are sort of generic geomtery utils
// perhaps they would be better served higher up.

/** Wrap a fractional displacement per component into [-0.5, 0.5].
 *
 * NOTE: this is only the true nearest image for near-orthogonal cells. For
 * skewed cells the shortest image can differ (off-diagonal metric coupling);
 * use {@link micDisplacement} with the metric tensor when lengths matter. */
export function minimumImage(df: Vec3): Float64Array {
  return new Float64Array([
    df[0] - Math.round(df[0]),
    df[1] - Math.round(df[1]),
    df[2] - Math.round(df[2]),
  ]);
}
/** Squared distance from a minimum-image vector using the metric tensor G. */
export function distanceSquared(mic: Vec3, G: Float64Array): number {
  const x = mic[0],
    y = mic[1],
    z = mic[2];

  return (
    x * (G[0] * x + G[1] * y + G[2] * z) +
    y * (G[3] * x + G[4] * y + G[5] * z) +
    z * (G[6] * x + G[7] * y + G[8] * z)
  );
}

/** True minimum-image displacement for the metric tensor G (row-major 3×3).
 *
 * Per-component wrapping minimizes each axis independently, but off-diagonal
 * metric terms couple the axes in skewed cells. Searching the 27 integer
 * images around the wrapped vector finds the shortest one (same ±1 standard
 * as the assignment search in symmetry/assign.ts). Returns the fractional
 * displacement vector, not a distance. */
export function micDisplacement(df: Vec3, G: Float64Array): Float64Array {
  const wrapped = minimumImage(df);
  const best = Float64Array.from(wrapped);
  let bestD = distanceSquared(wrapped, G);
  const trial = new Float64Array(3);

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        if (i === 0 && j === 0 && k === 0) continue;
        trial[0] = wrapped[0] + i;
        trial[1] = wrapped[1] + j;
        trial[2] = wrapped[2] + k;
        const d = distanceSquared(trial, G);
        if (d < bestD) {
          bestD = d;
          best.set(trial);
        }
      }
    }
  }

  return best;
}
