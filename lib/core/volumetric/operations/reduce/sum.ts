import { VolumetricData, ReduceOptions } from "../../volumetric";

/** Compute the sum of voxel values across all or per-channel.
 * @param vol - The volumetric dataset.
 * @param options - Reduction options specifying axis mode.
 * @returns Global sum or per-channel sum array.
 */
export function sum(
  vol: VolumetricData,
  { axis = "all" }: ReduceOptions = {},
): number | number[] {
  const { data, channels } = vol;

  if (axis === "all") {
    let total = 0;

    for (let i = 0; i < data.length; i++) {
      total += data[i];
    }

    return total;
  }

  const totals = new Float64Array(channels);

  for (let i = 0; i < data.length; i++) {
    totals[i % channels] += data[i];
  }

  return Array.from(totals);
}
