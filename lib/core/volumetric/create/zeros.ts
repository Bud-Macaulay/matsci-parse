import { createVolumetricData } from "../volumetric";

/** Create a volumetric grid filled with zeros. */
/** @param shape - Grid dimensions [depth, height, width]. */
/** @param channels - Number of channels (default 1). */
/** @returns A new VolumetricData with all values set to 0. */
export function zeros(shape: [number, number, number], channels = 1) {
  const size = shape[0] * shape[1] * shape[2] * channels;

  return createVolumetricData({
    shape,
    channels,
    data: new Float64Array(size),
  });
}
