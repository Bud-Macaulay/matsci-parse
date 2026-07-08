import { fill } from "./fill";

/** Create a volumetric grid filled with ones. */
/** @param shape - Grid dimensions [depth, height, width]. */
/** @param channels - Number of channels (default 1). */
/** @returns A new VolumetricData with all values set to 1. */
export function ones(shape: [number, number, number], channels = 1) {
  return fill(shape, 1, channels);
}
