import { VolumetricData, index } from "../../volumetric";

/** Trilinear interpolation at a continuous position in the volume.
 * @param vol - The volumetric dataset.
 * @param x - Continuous x coordinate.
 * @param y - Continuous y coordinate.
 * @param z - Continuous z coordinate.
 * @returns Array of interpolated values for all channels.
 */
export function sampleLinear(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
): number[];

/** Trilinear interpolation for a single channel at a continuous position.
 * @param vol - The volumetric dataset.
 * @param x - Continuous x coordinate.
 * @param y - Continuous y coordinate.
 * @param z - Continuous z coordinate.
 * @param channel - The channel index to sample.
 * @returns Interpolated value for the given channel.
 */
export function sampleLinear(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
  channel: number,
): number;

export function sampleLinear(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
  channel?: number,
): number | number[] {
  const [D, H, W] = vol.shape;

  // clamp bounds so interpolation stays safe
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);

  const x1 = Math.min(x0 + 1, W - 1);
  const y1 = Math.min(y0 + 1, H - 1);
  const z1 = Math.min(z0 + 1, D - 1);

  const tx = x - x0;
  const ty = y - y0;
  const tz = z - z0;

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const sampleAt = (xi: number, yi: number, zi: number, c: number) =>
    vol.data[index(vol, xi, yi, zi, c)];

  const interpolateChannel = (c: number) => {
    const c000 = sampleAt(x0, y0, z0, c);
    const c100 = sampleAt(x1, y0, z0, c);
    const c010 = sampleAt(x0, y1, z0, c);
    const c110 = sampleAt(x1, y1, z0, c);

    const c001 = sampleAt(x0, y0, z1, c);
    const c101 = sampleAt(x1, y0, z1, c);
    const c011 = sampleAt(x0, y1, z1, c);
    const c111 = sampleAt(x1, y1, z1, c);

    const c00 = lerp(c000, c100, tx);
    const c10 = lerp(c010, c110, tx);
    const c01 = lerp(c001, c101, tx);
    const c11 = lerp(c011, c111, tx);

    const c0 = lerp(c00, c10, ty);
    const c1 = lerp(c01, c11, ty);

    return lerp(c0, c1, tz);
  };

  if (channel !== undefined) {
    return interpolateChannel(channel);
  }

  const out = new Array<number>(vol.channels);

  for (let c = 0; c < vol.channels; c++) {
    out[c] = interpolateChannel(c);
  }

  return out;
}
