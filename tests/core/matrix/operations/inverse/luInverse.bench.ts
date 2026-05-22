import { bench, describe } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { luInverse } from "@/core/matrix/operations/inverse/luInverse";

function makeInvertibleMatrix(size: number) {
  // diagonally dominant => numerically stable + guaranteed invertible
  const data = new Array(size * size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === c) {
        data[r * size + c] = size + 1;
      } else {
        data[r * size + c] = 1;
      }
    }
  }

  return createMatrix(size, size, data);
}

const sizes = [32, 64, 128, 256];

describe("luInverse scaling", () => {
  for (const size of sizes) {
    const m = makeInvertibleMatrix(size);

    // warmup
    luInverse(m);

    bench(`${size}x${size} luInverse`, () => {
      luInverse(m);
    });
  }
});
