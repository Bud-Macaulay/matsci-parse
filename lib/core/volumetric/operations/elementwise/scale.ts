import { VolumetricData } from "../../volumetric";
import { map } from "./map";

export function scale(vol: VolumetricData, s: number): VolumetricData {
  return map(vol, (v) => v * s);
}
