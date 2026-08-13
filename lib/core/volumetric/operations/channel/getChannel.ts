import { VolumetricData } from "../../volumetric";

/** Extract a single channel as a flat array of voxel values.
 * @param vol - The volumetric dataset.
 * @param c - The channel index to extract.
 * @returns Flat array of voxel values for the given channel.
 */
export function getChannel(vol: VolumetricData, c: number): number[] {
  const { data, channels } = vol;

  const voxels = data.length / channels;

  const out = new Array(voxels);

  for (let i = 0; i < voxels; i++) {
    out[i] = data[i * channels + c];
  }

  return out;
}
