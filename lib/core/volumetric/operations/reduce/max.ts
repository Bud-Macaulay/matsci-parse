import { ReduceOptions, VolumetricData } from "../volumetric";

export function max(
  vol: VolumetricData,
  { axis = "all" }: ReduceOptions = {},
): number | number[] {
  const { data, channels } = vol;

  if (axis === "all") {
    let maximum = -Infinity;

    for (let i = 0; i < data.length; i++) {
      if (data[i] > maximum) {
        maximum = data[i];
      }
    }

    return maximum;
  }

  const maxs = new Float64Array(channels);
  maxs.fill(-Infinity);

  for (let i = 0; i < data.length; i++) {
    const c = i % channels;

    if (data[i] > maxs[c]) {
      maxs[c] = data[i];
    }
  }

  return Array.from(maxs);
}
