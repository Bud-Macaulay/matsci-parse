import { VolumetricData, createVolumetricData } from "../../volumetric";

/** Pad the volume on all sides by a given number of voxels per axis.
 * @param vol - The volumetric dataset.
 * @param px - Padding along x axis (both sides).
 * @param py - Padding along y axis (both sides).
 * @param pz - Padding along z axis (both sides).
 * @param fill - Fill value for padded regions (default 0).
 * @returns The padded volumetric dataset.
 */
export function pad(
  vol: VolumetricData,
  px: number,
  py: number,
  pz: number,
  fill = 0,
): VolumetricData {
  const { data, channels } = vol;
  const [D, H, W] = vol.shape;

  const newW = W + 2 * px;
  const newH = H + 2 * py;
  const newD = D + 2 * pz;

  const out = new Float64Array(newW * newH * newD * channels);

  out.fill(fill);

  const inIndex = (x: number, y: number, z: number, c: number) =>
    ((z * H + y) * W + x) * channels + c;

  const outIndex = (x: number, y: number, z: number, c: number) =>
    ((z * newH + y) * newW + x) * channels + c;

  for (let z = 0; z < D; z++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        for (let c = 0; c < channels; c++) {
          out[outIndex(x + px, y + py, z + pz, c)] = data[inIndex(x, y, z, c)];
        }
      }
    }
  }

  return createVolumetricData({
    shape: [newD, newH, newW],
    channels,
    data: out,
    basis: vol.basis,
    origin: vol.origin,
    field: vol.field,
    metadata: vol.metadata,
  });
}
