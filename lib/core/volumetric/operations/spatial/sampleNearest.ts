import { VolumetricData, index } from "../../volumetric";

export function sampleNearest(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
): number[];

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
