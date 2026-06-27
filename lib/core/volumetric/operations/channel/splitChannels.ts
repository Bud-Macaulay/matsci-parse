import { createVolumetricData, VolumetricData } from "../../volumetric";

export function splitChannels(vol: VolumetricData): VolumetricData[] {
  const { shape, channels, data, basis, origin, field, metadata } = vol;

  if (channels === 1) {
    return [vol];
  }

  const voxels = data.length / channels;

  const outputs = Array.from(
    { length: channels },
    () => new Float64Array(voxels),
  );

  let j = 0;

  for (let i = 0; i < voxels; i++) {
    for (let c = 0; c < channels; c++) {
      outputs[c][i] = data[j++];
    }
  }

  return outputs.map((channelData) =>
    createVolumetricData({
      shape,
      data: channelData,
      basis,
      origin,
      field,
      metadata,
    }),
  );
}
