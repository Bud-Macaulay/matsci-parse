import { Matrix } from "../../matrix";
import { createVolumetricData } from "../volumetric";

export function fromMatrixSlices(slices: Matrix[]) {
  if (slices.length === 0) {
    throw new Error("No slices provided");
  }

  const H = slices[0].rows;
  const W = slices[0].cols;
  const D = slices.length;

  const data = new Float64Array(D * H * W);

  let i = 0;

  for (let z = 0; z < D; z++) {
    const m = slices[z];

    if (m.rows !== H || m.cols !== W) {
      throw new Error("Inconsistent matrix slice dimensions");
    }

    data.set(m.data, i);
    i += m.data.length;
  }

  return createVolumetricData({
    shape: [D, H, W],
    data,
  });
}
