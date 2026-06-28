import { bench, describe } from "vitest";

import { fromFunction } from "@/core/volumetric/create/fromFunction";

import { getChannel } from "@/core/volumetric/operations/channel/getChannel";
import { splitChannels } from "@/core/volumetric/operations/channel/splitChannels";
import { mergeChannels } from "@/core/volumetric/operations/channel/mergeChannels";

import type { VolumetricData } from "@/core/volumetric/volumetric";

const sizes: [number, number, number][] = [
  [16, 16, 16],
  [64, 64, 64],
  [256, 256, 256],
];

type Benchmark<T> = {
  name: string;
  setup?: (vol: VolumetricData) => T;
  run: (input: T) => void;
};

const benchmarks: Benchmark<any>[] = [
  {
    name: "getChannel",
    run: (vol: VolumetricData) => {
      getChannel(vol, 2);
    },
  },
  {
    name: "splitChannels",
    run: (vol: VolumetricData) => {
      splitChannels(vol);
    },
  },
  {
    name: "mergeChannels",
    setup: (vol: VolumetricData) => splitChannels(vol),
    run: (channels: VolumetricData[]) => {
      mergeChannels(channels);
    },
  },
];

describe("channel operations scaling", () => {
  for (const shape of sizes) {
    const volume = fromFunction(shape, (x, y, z, c) => x + y + z + c, 4);

    // Warm up
    getChannel(volume, 0);
    const split = splitChannels(volume);
    mergeChannels(split);

    for (const { name, setup, run } of benchmarks) {
      const input = setup ? setup(volume) : volume;

      bench(`${shape.join("x")} ${name}`, () => {
        run(input);
      });
    }
  }
});
