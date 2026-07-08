import { zip } from "./zip";
import { VolumetricData } from "../../volumetric";

/** Element-wise subtraction of two volumetric datasets.
 * @param a - First volumetric dataset.
 * @param b - Second volumetric dataset.
 * @returns New volume where each voxel = a - b.
 */
export function sub(a: VolumetricData, b: VolumetricData): VolumetricData {
  return zip(a, b, (va, vb) => va - vb);
}
