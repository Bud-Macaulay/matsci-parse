import { VolumetricData } from "../../volumetric";

/** Element-wise multiplication of two volumetric datasets.
 * @param a - First volumetric dataset.
 * @param b - Second volumetric dataset.
 * @returns New volume where each voxel = a * b.
 */
export function mul(a: VolumetricData, b: VolumetricData): VolumetricData {
  if (
    a.shape[0] !== b.shape[0] ||
    a.shape[1] !== b.shape[1] ||
    a.shape[2] !== b.shape[2] ||
    a.channels !== b.channels
  ) {
    throw new Error("VolumetricData shape mismatch");
  }

  const ad = a.data;
  const bd = b.data;
  const out = new Float64Array(ad.length);

  for (let i = 0; i < out.length; i++) {
    out[i] = ad[i] * bd[i];
  }

  return {
    ...a,
    data: out,
  };
}
