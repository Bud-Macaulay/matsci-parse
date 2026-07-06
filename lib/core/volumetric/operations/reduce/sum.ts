import { VolumetricData, ReduceOptions } from "../../volumetric";

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
