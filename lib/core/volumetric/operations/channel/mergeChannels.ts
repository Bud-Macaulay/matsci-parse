import { createVolumetricData, VolumetricData } from "../../volumetric";

export function mergeChannels(volumes: VolumetricData[]): VolumetricData {
  if (volumes.length === 0) {
    throw new Error("No volumes provided");
  }

  const first = volumes[0];

  if (first.channels !== 1) {
    throw new Error("All input volumes must be single-channel");
  }

  const { shape, basis, origin, field } = first;

  for (const vol of volumes) {
    if (vol.channels !== 1) {
      throw new Error("All input volumes must be single-channel");
    }

    if (
      vol.shape[0] !== shape[0] ||
      vol.shape[1] !== shape[1] ||
      vol.shape[2] !== shape[2]
    ) {
      throw new Error("Volume shapes do not match");
    }
  }

  const voxels = first.data.length;
  const channels = volumes.length;

  const data = new Float64Array(voxels * channels);

  let j = 0;

  for (let i = 0; i < voxels; i++) {
    for (let c = 0; c < channels; c++) {
      data[j++] = volumes[c].data[i];
    }
  }

  return createVolumetricData({
    shape,
    channels,
    data,
    basis,
    origin,
    field,
  });
}
