import { createVolumetricData } from "../volumetric";

// data creation is by default filled with 0s so we can just early return
export function zeros(shape: [number, number, number], channels = 1) {
  const size = shape[0] * shape[1] * shape[2] * channels;

  return createVolumetricData({
    shape,
    channels,
    data: new Float64Array(size),
  });
}
