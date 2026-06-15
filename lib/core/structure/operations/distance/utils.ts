export type Vec3 = [number, number, number] | Float64Array | number[];

export function minimumImage(df: Vec3): Vec3 {
  return [
    df[0] - Math.round(df[0]),
    df[1] - Math.round(df[1]),
    df[2] - Math.round(df[2]),
  ];
}

// flat metric tensor dot product: d^2 = x^T G x
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
