import { createVolumetricData } from "../volumetric";

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
