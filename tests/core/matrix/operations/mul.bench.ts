import { bench, describe } from "vitest";

import { mul } from "@/core/matrix/operations/mul";
import { createMatrix } from "@/core/matrix/matrix";

function makeMatrix(size: number, value: number) {
  return createMatrix(size, size, Array(size * size).fill(value));
}

const sizes = [8, 16, 32, 128, 256];

describe("matrix mul scaling", () => {
  for (const size of sizes) {
    const a = makeMatrix(size, 1);
    const b = makeMatrix(size, 2);

    mul(a, b);

    const label = `${size}x${size} mul`;

    bench(label, () => {
      mul(a, b);
    });
  }
});
