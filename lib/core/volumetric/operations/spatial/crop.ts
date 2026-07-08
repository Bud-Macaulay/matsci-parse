import { VolumetricData, createVolumetricData, index } from "../../volumetric";

/** Extract a rectangular sub-volume from the dataset.
 * @param vol - The volumetric dataset.
 * @param x0 - Start x coordinate (inclusive).
 * @param y0 - Start y coordinate (inclusive).
 * @param z0 - Start z coordinate (inclusive).
 * @param x1 - End x coordinate (exclusive).
 * @param y1 - End y coordinate (exclusive).
 * @param z1 - End z coordinate (exclusive).
 * @returns The cropped volumetric dataset.
 */
export function crop(
  vol: VolumetricData,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): VolumetricData {
  const { data, channels } = vol;
  const [D, H, W] = vol.shape;

  const outW = x1 - x0;
  const outH = y1 - y0;
  const outD = z1 - z0;

  const out = new Float64Array(outW * outH * outD * channels);

  let o = 0;

  for (let z = z0; z < z1; z++) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        for (let c = 0; c < channels; c++) {
          out[o++] = data[index(vol, x, y, z, c)];
        }
      }
    }
  }

  return createVolumetricData({
    shape: [outD, outH, outW],
    channels,
    data: out,
    basis: vol.basis,
    origin: vol.origin,
    field: vol.field,
    metadata: vol.metadata,
  });
}
