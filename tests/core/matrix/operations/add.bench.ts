import { bench, describe } from "vitest";

import { add } from "@/core/matrix/operations/add";
import { createMatrix } from "@/core/matrix/matrix";

function makeMatrix(size: number, value: number) {
  return createMatrix(size, size, Array(size * size).fill(value));
}

const sizes = [8, 32, 128, 512, 2048];

describe("matrix add scaling", () => {
  for (const size of sizes) {
    const a = makeMatrix(size, 1);
    const b = makeMatrix(size, 2);

    // warmup (important for JIT stability)
    add(a, b);

    bench(`${size}x${size} add`, () => {
      add(a, b);
    });
  }
});
