import { createVolumetricData } from "../volumetric";
import { Matrix } from "../../matrix";

export function fromMatrixSlices(slices: Matrix[], channels = 1) {
  if (slices.length === 0) {
    throw new Error("No slices provided");
  }

  const H = slices[0].rows;
  const W = slices[0].cols;
  const D = slices.length;

  const data = new Float64Array(D * H * W * channels);

  let i = 0;

  for (let z = 0; z < D; z++) {
    const m = slices[z];

    if (m.rows !== H || m.cols !== W) {
      throw new Error("Inconsistent matrix slice dimensions");
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;

        for (let c = 0; c < channels; c++) {
          data[i++] = m.data[idx]; // assumes scalar matrices
        }
      }
    }
  }

  return createVolumetricData({
    shape: [D, H, W],
    channels,
    data,
  });
}
