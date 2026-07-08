import { ReduceOptions, VolumetricData } from "../../volumetric";

/** Compute the minimum voxel value across all or per-channel.
 * @param vol - The volumetric dataset.
 * @param options - Reduction options specifying axis mode.
 * @returns Global minimum or per-channel minimum array.
 */
export function min(
  vol: VolumetricData,
  { axis = "all" }: ReduceOptions = {},
): number | number[] {
  const { data, channels } = vol;

  if (axis === "all") {
    let minimum = Infinity;

    for (let i = 0; i < data.length; i++) {
      if (data[i] < minimum) {
        minimum = data[i];
      }
    }

    return minimum;
  }

  const mins = new Float64Array(channels);
  mins.fill(Infinity);

  for (let i = 0; i < data.length; i++) {
    const c = i % channels;

    if (data[i] < mins[c]) {
      mins[c] = data[i];
    }
  }

  return Array.from(mins);
}
