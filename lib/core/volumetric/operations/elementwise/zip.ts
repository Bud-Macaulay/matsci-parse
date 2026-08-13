import { VolumetricData } from "../../volumetric";

/** Combine two volumes element-wise using a binary function.
 * @param a - First volumetric dataset.
 * @param b - Second volumetric dataset.
 * @param fn - Binary function receiving (va, vb, x, y, z, channel, index).
 * @returns New volume with combined voxel values.
 */
export function zip(
  a: VolumetricData,
  b: VolumetricData,
  fn: (
    va: number,
    vb: number,
    x: number,
    y: number,
    z: number,
    c: number,
    index: number,
  ) => number,
): VolumetricData {
  if (
    a.shape[0] !== b.shape[0] ||
    a.shape[1] !== b.shape[1] ||
    a.shape[2] !== b.shape[2] ||
    a.channels !== b.channels
  ) {
    throw new Error("VolumetricData shape mismatch");
  }

  const size = a.data.length;
  const out = new Float64Array(size);

  // Fast path: a binary fn that ignores the (x, y, z, c) coordinates only
  // needs a flat loop, avoiding the nested-loop overhead per element.
  if (fn.length <= 2) {
    const ad = a.data;
    const bd = b.data;

    for (let i = 0; i < size; i++) {
      out[i] = fn(ad[i], bd[i]);
    }

    return {
      ...a,
      data: out,
    };
  }

  let i = 0;

  const [D, H, W] = a.shape;
  const channels = a.channels;

  for (let z = 0; z < D; z++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        for (let c = 0; c < channels; c++) {
          out[i] = fn(a.data[i], b.data[i], x, y, z, c, i);
          i++;
        }
      }
    }
  }

  return {
    ...a,
    data: out,
  };
}
