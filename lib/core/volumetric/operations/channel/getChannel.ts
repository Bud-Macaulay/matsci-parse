import { VolumetricData, index } from "../../volumetric";

export function getChannel(vol: VolumetricData, c: number): number[] {
  const { shape, data } = vol;

  const [D, H, W] = shape;
  const voxels = D * H * W;

  const out = new Array(voxels);

  for (let i = 0; i < voxels; i++) {
    const z = Math.floor(i / (H * W));
    const y = Math.floor((i % (H * W)) / W);
    const x = i % W;

    out[i] = data[index(vol, x, y, z, c)];
  }

  return out;
}
