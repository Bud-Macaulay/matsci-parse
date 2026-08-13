import { createVolumetricData, VolumetricData } from "../../volumetric";

/** Split a multi-channel volume into an array of single-channel volumes.
 * @param vol - The volumetric dataset to split.
 * @returns Array of single-channel volumetric datasets.
 */
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

  if (channels === 4) {
    const o0 = outputs[0];
    const o1 = outputs[1];
    const o2 = outputs[2];
    const o3 = outputs[3];
    let j = 0;

    for (let i = 0; i < voxels; i++) {
      o0[i] = data[j++];
      o1[i] = data[j++];
      o2[i] = data[j++];
      o3[i] = data[j++];
    }
  } else {
    let j = 0;

    for (let i = 0; i < voxels; i++) {
      for (let c = 0; c < channels; c++) {
        outputs[c][i] = data[j++];
      }
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
