import { VolumetricData } from "../../volumetric";
import { resize } from "./resize";

export function upsample(
  vol: VolumetricData,
  factor: number | [number, number, number] = 2,
): VolumetricData {
  const [D, H, W] = vol.shape;

  const [fd, fh, fw] =
    typeof factor === "number" ? [factor, factor, factor] : factor;

  const newShape: [number, number, number] = [
    Math.max(1, Math.floor(D * fd)),
    Math.max(1, Math.floor(H * fh)),
    Math.max(1, Math.floor(W * fw)),
  ];

  return resize(vol, newShape);
}
