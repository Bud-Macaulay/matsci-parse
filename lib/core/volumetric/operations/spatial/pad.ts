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

  const ch = channels;
  const inRowStride = W * ch;
  const outRowStride = newW * ch;

  for (let z = 0; z < D; z++) {
    const inZOffset = z * H * inRowStride;
    const outZOffset = (z + pz) * newH * outRowStride + py * outRowStride + px * ch;

    for (let y = 0; y < H; y++) {
      const srcOffset = inZOffset + y * inRowStride;
      const dstOffset = outZOffset + y * outRowStride;

      out.set(data.subarray(srcOffset, srcOffset + W * ch), dstOffset);
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
