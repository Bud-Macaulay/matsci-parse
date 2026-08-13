import { VolumetricData, createVolumetricData } from "../../volumetric";

/** Shift the volume content by an integer offset along each axis.
 * @param vol - The volumetric dataset.
 * @param dx - Translation along x axis.
 * @param dy - Translation along y axis.
 * @param dz - Translation along z axis.
 * @returns A new translated volumetric dataset.
 */
export function translate(
  vol: VolumetricData,
  dx: number,
  dy: number,
  dz: number,
): VolumetricData {
  const { shape, channels, data } = vol;
  const [D, H, W] = shape;

  const newData = new Float64Array(data.length);

  const ch = channels;
  const rowStride = W * ch;

  for (let z = 0; z < D; z++) {
    const nz = z - dz;

    if (nz < 0 || nz >= D) continue;

    for (let y = 0; y < H; y++) {
      const ny = y - dy;

      if (ny < 0 || ny >= H) continue;

      const xFrom = Math.max(0, dx);
      const xTo = Math.min(W, W + dx);
      const rowLen = (xTo - xFrom) * ch;

      if (rowLen <= 0) continue;

      const srcOffset = ((nz * H + ny) * W + (xFrom - dx)) * ch;
      const dstOffset = ((z * H + y) * W + xFrom) * ch;

      newData.set(data.subarray(srcOffset, srcOffset + rowLen), dstOffset);
    }
  }

  return createVolumetricData({
    shape,
    channels,
    data: newData,
    basis: vol.basis,
    origin: vol.origin,
    field: vol.field,
    metadata: vol.metadata,
  });
}
