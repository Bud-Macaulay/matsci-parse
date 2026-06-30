import { VolumetricData, createVolumetricData } from "../../volumetric";
import { sampleLinear } from "./sampleLinear";

export function resize(
  vol: VolumetricData,
  newShape: [number, number, number],
): VolumetricData {
  const [D2, H2, W2] = newShape;
  const [D1, H1, W1] = vol.shape;

  const out = new Float64Array(D2 * H2 * W2 * vol.channels);

  let i = 0;

  for (let z = 0; z < D2; z++) {
    const wz = (z / (D2 - 1 || 1)) * (D1 - 1);

    for (let y = 0; y < H2; y++) {
      const wy = (y / (H2 - 1 || 1)) * (H1 - 1);

      for (let x = 0; x < W2; x++) {
        const wx = (x / (W2 - 1 || 1)) * (W1 - 1);

        const value = sampleLinear(vol, wx, wy, wz);

        for (let c = 0; c < vol.channels; c++) {
          out[i++] = value[c];
        }
      }
    }
  }

  return createVolumetricData({
    shape: newShape,
    channels: vol.channels,
    data: out,
    basis: vol.basis,
    origin: vol.origin,
    field: vol.field,
    metadata: vol.metadata,
  });
}
