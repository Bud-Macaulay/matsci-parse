import { createVolumetricData } from "../volumetric";

/** Create a volumetric grid filled with a constant value. */
/** @param shape - Grid dimensions [depth, height, width]. */
/** @param value - Fill value. */
/** @param channels - Number of channels (default 1). */
/** @returns A new VolumetricData filled with value. */
export function fill(
  shape: [number, number, number],
  value: number,
  channels = 1,
) {
  const size = shape[0] * shape[1] * shape[2] * channels;

  return createVolumetricData({
    shape,
    channels,
    data: new Float64Array(size).fill(value),
  });
}
