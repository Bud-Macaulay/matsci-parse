import { zip } from "./zip";
import { VolumetricData } from "../../volumetric";

/** Element-wise addition of two volumetric datasets.
 * @param a - First volumetric dataset.
 * @param b - Second volumetric dataset.
 * @returns New volume where each voxel = a + b.
 */
export function add(a: VolumetricData, b: VolumetricData): VolumetricData {
  return zip(a, b, (va, vb) => va + vb);
}
