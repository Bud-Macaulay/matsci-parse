import { VolumetricData } from "../../volumetric";

export function map(
  vol: VolumetricData,
  fn: (
    value: number,
    x: number,
    y: number,
    z: number,
    c: number,
    index: number,
  ) => number,
): VolumetricData {
  const [D, H, W] = vol.shape;
  const channels = vol.channels;

  const size = D * H * W * channels;
  const out = new Float64Array(size);

  let i = 0;

  for (let z = 0; z < D; z++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        for (let c = 0; c < channels; c++) {
          out[i] = fn(vol.data[i], x, y, z, c, i);
          i++;
        }
      }
    }
  }

  return {
    ...vol,
    data: out,
  };
}
