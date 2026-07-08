import { createVolumetricData } from "../volumetric";

/** Generate volumetric data by evaluating a function over every voxel and channel. */
/** @param shape - Grid dimensions [depth, height, width]. */
/** @param fn - Callback receiving (x, y, z, c) returning the value at that voxel. */
/** @param channels - Number of channels (default 1). */
/** @returns A new VolumetricData populated by fn. */
export function fromFunction(
  shape: [number, number, number],
  fn: (x: number, y: number, z: number, c: number) => number,
  channels = 1,
) {
  const [D, H, W] = shape;
  const data = new Float64Array(D * H * W * channels);

  let i = 0;

  for (let z = 0; z < D; z++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        for (let c = 0; c < channels; c++) {
          data[i++] = fn(x, y, z, c);
        }
      }
    }
  }

  return createVolumetricData({
    shape,
    channels,
    data,
  });
}
