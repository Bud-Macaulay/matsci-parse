import { bench, describe } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { transpose } from "@/core/matrix/operations/transpose";

function createRandomMatrix(rows: number, cols: number) {
  const data = new Array(rows * cols);

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random();
  }

  return createMatrix(rows, cols, data);
}

describe("transpose scaling", () => {
  const m32 = createRandomMatrix(32, 32);
  const m64 = createRandomMatrix(64, 64);
  const m128 = createRandomMatrix(128, 128);
  const m256 = createRandomMatrix(256, 256);
  const m512 = createRandomMatrix(512, 512);
  const m1024 = createRandomMatrix(1024, 1024);

  bench("32x32 transpose", () => {
    transpose(m32);
  });

  bench("64x64 transpose", () => {
    transpose(m64);
  });

  bench("128x128 transpose", () => {
    transpose(m128);
  });

  bench("256x256 transpose", () => {
    transpose(m256);
  });

  bench("512x512 transpose", () => {
    transpose(m512);
  });

  bench("1024x1024 transpose", () => {
    transpose(m1024);
  });
});

describe("transpose rectangular", () => {
  const wide = createRandomMatrix(128, 512);
  const tall = createRandomMatrix(512, 128);
  const wideLarge = createRandomMatrix(256, 1024);
  const tallLarge = createRandomMatrix(1024, 256);

  bench("128x512 transpose", () => {
    transpose(wide);
  });

  bench("512x128 transpose", () => {
    transpose(tall);
  });

  bench("256x1024 transpose", () => {
    transpose(wideLarge);
  });

  bench("1024x256 transpose", () => {
    transpose(tallLarge);
  });
});
