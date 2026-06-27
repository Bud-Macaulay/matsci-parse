import { zip } from "./zip";
import { VolumetricData } from "../volumetric";

export function mul(a: VolumetricData, b: VolumetricData): VolumetricData {
  return zip(a, b, (va, vb) => va * vb);
}
