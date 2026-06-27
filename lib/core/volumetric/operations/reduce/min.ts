import { ReduceOptions, VolumetricData } from "../volumetric";

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
