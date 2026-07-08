/** A 3-component vector. */
export type Vec3 = Float64Array;

// TODO: these are sort of generic geomtery utils
// perhaps they would be better served higher up.

/** Wrap a fractional displacement into the minimum-image convention (components in [-0.5, 0.5]). */
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
