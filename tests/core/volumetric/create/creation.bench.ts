import { bench, describe } from "vitest";

import { zeros } from "@/core/volumetric/create/zeros";
import { ones } from "@/core/volumetric/create//ones";
import { fill } from "@/core/volumetric/create/fill";
import { fromFunction } from "@/core/volumetric/create/fromFunction";
import { fromMatrixSlices } from "@/core/volumetric/create/fromMatrixSlices";

const sizes: [number, number, number][] = [
  [16, 16, 16],
  [64, 64, 64],
  [256, 256, 256],
];

function makeSlices(D: number, H: number, W: number) {
  return Array.from({ length: D }, () => ({
    rows: H,
    cols: W,
    data: new Float64Array(H * W).fill(1),
  })) as any;
}

// -------------------------
// benchmark suite
// -------------------------
describe("volumetric creation scaling", () => {
  for (const shape of sizes) {
    const [D, H, W] = shape;

    // warmup (important for JIT stability)
    zeros(shape);
    ones(shape);
    fill(shape, 1);
    fromFunction(shape, (x, y, z) => x + y + z);

    const slices = makeSlices(D, H, W);
    fromMatrixSlices(slices);

    bench(`${D}x${H}x${W} zeros`, () => {
      zeros(shape);
    });

    bench(`${D}x${H}x${W} ones`, () => {
      ones(shape);
    });

    bench(`${D}x${H}x${W} fill`, () => {
      fill(shape, 3.14);
    });

    bench(`${D}x${H}x${W} fromFunction`, () => {
      fromFunction(shape, (x, y, z) => x + y + z);
    });

    bench(`${D}x${H}x${W} fromFunctionExp`, () => {
      fromFunction(shape, (x, y, z) => x ** 2 + Math.sqrt(y) + z);
    });

    bench(`${D}x${H}x${W} fromMatrixSlices`, () => {
      fromMatrixSlices(slices);
    });
  }
});
