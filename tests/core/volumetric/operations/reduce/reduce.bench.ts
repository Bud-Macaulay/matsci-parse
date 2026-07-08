import { bench, describe } from "vitest";
import { fromFunction } from "@/core/volumetric/create/fromFunction";
import { sum } from "@/core/volumetric/operations/reduce/sum";
import { mean } from "@/core/volumetric/operations/reduce/mean";
import { min } from "@/core/volumetric/operations/reduce/min";
import { max } from "@/core/volumetric/operations/reduce/max";

const sizes: [number, number, number][] = [
  [16, 16, 16],
  [64, 64, 64],
  [256, 256, 256],
];

describe("volumetric reduce scaling", () => {
  for (const shape of sizes) {
    const v = fromFunction(shape, (x, y, z, c) => x + y + z + c, 4);

    sum(v);
    mean(v);
    min(v);
    max(v);

    bench(`${shape.join("x")} sum`, () => { sum(v); });
    bench(`${shape.join("x")} mean`, () => { mean(v); });
    bench(`${shape.join("x")} min`, () => { min(v); });
    bench(`${shape.join("x")} max`, () => { max(v); });
  }
});
