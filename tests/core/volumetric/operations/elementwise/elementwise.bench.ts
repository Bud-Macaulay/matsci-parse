import { bench, describe } from "vitest";

import { fromFunction } from "@/core/volumetric/create/fromFunction";

import { add } from "@/core/volumetric/operations/elementwise/add";
import { sub } from "@/core/volumetric/operations/elementwise/sub";
import { mul } from "@/core/volumetric/operations/elementwise/mul";
import { scale } from "@/core/volumetric/operations/elementwise/scale";
import { map } from "@/core/volumetric/operations/elementwise/map";
import { zip } from "@/core/volumetric/operations/elementwise/zip";

import type { VolumetricData } from "@/core/volumetric/volumetric";

const sizes: [number, number, number][] = [
  [8, 8, 8],
  [32, 32, 32],
  [128, 128, 128],
];

type Benchmark<T> = {
  name: string;
  setup?: (a: VolumetricData, b: VolumetricData) => T;
  run: (input: T) => void;
};

const benchmarks: Benchmark<any>[] = [
  {
    name: "add",
    setup: (a, b) => ({ a, b }),
    run: ({ a, b }) => {
      add(a, b);
    },
  },
  {
    name: "sub",
    setup: (a, b) => ({ a, b }),
    run: ({ a, b }) => {
      sub(a, b);
    },
  },
  {
    name: "mul",
    setup: (a, b) => ({ a, b }),
    run: ({ a, b }) => {
      mul(a, b);
    },
  },
  {
    name: "scale",
    setup: (a) => a,
    run: (a) => {
      scale(a, 2);
    },
  },
  {
    name: "map",
    setup: (a) => a,
    run: (a) => {
      map(a, (v) => v + 1);
    },
  },
  {
    name: "zip",
    setup: (a, b) => ({ a, b }),
    run: ({ a, b }) => {
      zip(a, b, (x, y) => x + y);
    },
  },
];

describe("elementwise operations scaling", () => {
  for (const shape of sizes) {
    const a = fromFunction(shape, (x, y, z, c) => x + y + z + c, 4);

    const b = fromFunction(shape, (x, y, z, c) => x * y + z + c, 4);

    // Warm-up
    add(a, b);
    sub(a, b);
    mul(a, b);
    scale(a, 2);
    map(a, (v) => v + 1);
    zip(a, b, (x, y) => x + y);

    for (const { name, setup, run } of benchmarks) {
      const input = setup ? setup(a, b) : a;

      bench(`${shape.join("x")} ${name}`, () => {
        run(input);
      });
    }
  }
});
