import { bench, describe } from "vitest";
import { fromFunction } from "@/core/volumetric/create/fromFunction";
import { translate } from "@/core/volumetric/operations/spatial/translate";
import { crop } from "@/core/volumetric/operations/spatial/crop";
import { pad } from "@/core/volumetric/operations/spatial/pad";

const sizes: [number, number, number][] = [
  [16, 16, 16],
  [64, 64, 64],
  [128, 128, 128],
];

describe("volumetric translate scaling", () => {
  for (const shape of sizes) {
    const v = fromFunction(shape, (x, y, z) => x + y + z);

    translate(v, 2, 3, 1);

    bench(`${shape.join("x")} translate`, () => {
      translate(v, 2, 3, 1);
    });
  }
});

describe("volumetric crop scaling", () => {
  for (const shape of sizes) {
    const v = fromFunction(shape, (x, y, z) => x + y + z);
    const [D, H, W] = shape;

    crop(v, 0, 0, 0, W, H, D);

    bench(`${shape.join("x")} crop (identity)`, () => {
      crop(v, 0, 0, 0, W, H, D);
    });

    const halfW = Math.floor(W / 2);
    const halfH = Math.floor(H / 2);
    const halfD = Math.floor(D / 2);

    crop(v, 0, 0, 0, halfW, halfH, halfD);

    bench(`${shape.join("x")} crop (half)`, () => {
      crop(v, 0, 0, 0, halfW, halfH, halfD);
    });
  }
});

describe("volumetric pad scaling", () => {
  for (const shape of sizes) {
    const v = fromFunction(shape, (x, y, z) => x + y + z);

    pad(v, 2, 4, 8, 0);

    bench(`${shape.join("x")} pad (2,4,8)`, () => {
      pad(v, 2, 4, 8, 0);
    });
  }
});
