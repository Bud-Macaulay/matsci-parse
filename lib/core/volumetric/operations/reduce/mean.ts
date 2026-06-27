import { ReduceOptions, VolumetricData } from "../volumetric";

export function mean(
  vol: VolumetricData,
  { axis = "all" }: ReduceOptions = {},
): number | number[] {
  const { data, channels } = vol;

  if (axis === "all") {
    let total = 0;

    for (let i = 0; i < data.length; i++) {
      total += data[i];
    }

    return total / data.length;
  }

  const totals = new Float64Array(channels);

  for (let i = 0; i < data.length; i++) {
    totals[i % channels] += data[i];
  }

  const voxels = data.length / channels;

  for (let c = 0; c < channels; c++) {
    totals[c] /= voxels;
  }

  return Array.from(totals);
}
