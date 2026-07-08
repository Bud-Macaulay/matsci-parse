import { VolumetricData, createVolumetricData, index } from "../../volumetric";

/** Set all channel values at a single voxel position, returning a new volume.
 * @param vol - The volumetric dataset.
 * @param x - Voxel x coordinate.
 * @param y - Voxel y coordinate.
 * @param z - Voxel z coordinate.
 * @param value - Array of channel values to set.
 * @returns A new volumetric dataset with the updated voxel.
 */
export function setVoxel(
  vol: VolumetricData,
  x: number,
  y: number,
  z: number,
  value: number[],
): VolumetricData {
  const { data, shape, channels } = vol;

  const newData = data.slice();

  for (let c = 0; c < channels; c++) {
    newData[index(vol, x, y, z, c)] = value[c];
  }

  return createVolumetricData({
    shape,
    channels,
    data: newData,
    basis: vol.basis,
    origin: vol.origin,
    field: vol.field,
    metadata: vol.metadata,
  });
}
