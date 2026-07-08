import { VolumetricData } from "../../volumetric";
import { map } from "./map";

/** Scale all voxel values by a scalar factor.
 * @param vol - The volumetric dataset.
 * @param s - Scalar multiplier.
 * @returns New volume with scaled voxel values.
 */
export function scale(vol: VolumetricData, s: number): VolumetricData {
  return map(vol, (v) => v * s);
}
