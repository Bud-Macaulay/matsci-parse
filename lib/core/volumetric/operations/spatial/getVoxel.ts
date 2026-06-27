import { VolumetricData, index } from "../../volumetric";

export function getVoxel(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
): number[] {
  const { data, channels } = vol;

  const out = new Array(channels);

  for (let c = 0; c < channels; c++) {
    out[c] = data[index(vol, x, y, z, c)];
  }

  return out;
}
