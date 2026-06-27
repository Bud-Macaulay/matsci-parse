import { VolumetricData, createVolumetricData } from "../../volumetric";

export function translate(
  vol: VolumetricData,
  dx: number,
  dy: number,
  dz: number,
): VolumetricData {
  const { shape, channels, data } = vol;
  const [D, H, W] = shape;

  const newData = new Float64Array(data.length);

  const inIndex = (x: number, y: number, z: number, c: number) =>
    ((z * H + y) * W + x) * channels + c;

  const outIndex = (x: number, y: number, z: number, c: number) =>
    ((z * H + y) * W + x) * channels + c;

  for (let z = 0; z < D; z++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nz = z - dz;
        const ny = y - dy;
        const nx = x - dx;

        if (nx < 0 || ny < 0 || nz < 0 || nx >= W || ny >= H || nz >= D)
          continue;

        for (let c = 0; c < channels; c++) {
          newData[outIndex(x, y, z, c)] = data[inIndex(nx, ny, nz, c)];
        }
      }
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
