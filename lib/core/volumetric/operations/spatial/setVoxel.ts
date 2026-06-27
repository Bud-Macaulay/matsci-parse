import { VolumetricData, createVolumetricData, index } from "../../volumetric";

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
