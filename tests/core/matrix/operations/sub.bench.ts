import { bench, describe } from "vitest";

import { sub } from "@/core/matrix/operations/sub";
import { createMatrix } from "@/core/matrix/matrix";

function makeMatrix(size: number, value: number) {
  return createMatrix(size, size, Array(size * size).fill(value));
}

const sizes = [8, 32, 128, 512, 2048];

describe("matrix sub scaling", () => {
  for (const size of sizes) {
    const a = makeMatrix(size, 1);
    const b = makeMatrix(size, 2);

    // warmup (important for JIT stability)
    sub(a, b);

    bench(`${size}x${size} sub`, () => {
      sub(a, b);
    });
  }
});
