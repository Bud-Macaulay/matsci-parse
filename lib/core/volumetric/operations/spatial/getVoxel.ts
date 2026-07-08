import { VolumetricData, index } from "../../volumetric";

/** Retrieve all channel values at a single voxel position.
 * @param vol - The volumetric dataset.
 * @param x - Voxel x coordinate.
 * @param y - Voxel y coordinate.
 * @param z - Voxel z coordinate.
 * @returns Array of channel values at the given position.
 */
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
