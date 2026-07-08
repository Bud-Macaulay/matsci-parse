import { bench, describe } from "vitest";
import { fromFunction } from "@/core/volumetric/create/fromFunction";
import { sampleLinear } from "@/core/volumetric/operations/spatial/sampleLinear";
import { sampleNearest } from "@/core/volumetric/operations/spatial/sampleNearest";

const sizes: [number, number, number][] = [
  [32, 32, 32],
  [128, 128, 128],
];

const points = 1000;

describe("volumetric sampling scaling", () => {
  for (const shape of sizes) {
    const v = fromFunction(shape, (x, y, z) => x + y + z, 4);
    const [D, H, W] = shape;

    const coords = Array.from({ length: points }, () => ({
      x: Math.random() * (W - 1),
      y: Math.random() * (H - 1),
      z: Math.random() * (D - 1),
    }));

    // warmup
    for (const { x, y, z } of coords.slice(0, 10)) {
      sampleLinear(v, x, y, z);
      sampleNearest(v, x, y, z);
    }

    bench(`${shape.join("x")} sampleLinear ${points} pts`, () => {
      for (const { x, y, z } of coords) {
        sampleLinear(v, x, y, z);
      }
    });

    bench(`${shape.join("x")} sampleNearest ${points} pts`, () => {
      for (const { x, y, z } of coords) {
        sampleNearest(v, x, y, z);
      }
    });
  }
});
