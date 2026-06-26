import { createVolumetricData } from "../volumetric";

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
