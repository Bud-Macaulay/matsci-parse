import { VolumetricData, index } from "../../volumetric";

/** Nearest-neighbour sampling at a continuous position in the volume.
 * @param vol - The volumetric dataset.
 * @param x - Continuous x coordinate.
 * @param y - Continuous y coordinate.
 * @param z - Continuous z coordinate.
 * @returns Array of sampled values for all channels.
 */
export function sampleNearest(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
): number[];

/** Nearest-neighbour sampling for a single channel.
 * @param vol - The volumetric dataset.
 * @param x - Continuous x coordinate.
 * @param y - Continuous y coordinate.
 * @param z - Continuous z coordinate.
 * @param channel - The channel index to sample.
 * @returns Sampled value for the given channel.
 */
export function sampleNearest(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
  channel: number,
): number;

export function sampleNearest(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
  channel?: number,
): number | number[] {
  const xi = Math.round(x);
  const yi = Math.round(y);
  const zi = Math.round(z);

  const [D, H, W] = vol.shape;

  if (xi < 0 || xi >= W || yi < 0 || yi >= H || zi < 0 || zi >= D) {
    if (channel !== undefined) {
      return NaN;
    }

    return new Array(vol.channels).fill(NaN);
  }

  if (channel !== undefined) {
    return vol.data[index(vol, xi, yi, zi, channel)];
  }

  const values = new Array<number>(vol.channels);

  for (let c = 0; c < vol.channels; c++) {
    values[c] = vol.data[index(vol, xi, yi, zi, c)];
  }

  return values;
}
