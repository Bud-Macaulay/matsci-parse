import { VolumetricData } from "../../volumetric";
import { resize } from "./resize";

/** Reduce spatial resolution by an integer or per-axis factor.
 * @param vol - The volumetric dataset.
 * @param factor - Downsampling factor (scalar or per-axis tuple).
 * @returns The downsampled volumetric dataset.
 */
export function downsample(
  vol: VolumetricData,
  factor: number | [number, number, number] = 2,
): VolumetricData {
  const [D, H, W] = vol.shape;

  const [fd, fh, fw] =
    typeof factor === "number" ? [factor, factor, factor] : factor;

  const newShape: [number, number, number] = [
    Math.max(1, Math.floor(D / fd)),
    Math.max(1, Math.floor(H / fh)),
    Math.max(1, Math.floor(W / fw)),
  ];

  return resize(vol, newShape);
}
