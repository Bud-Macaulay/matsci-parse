import { bench, describe } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { gjInverse } from "@/core/matrix/operations/inverse/gaussJordan";

function makeInvertibleMatrix(size: number) {
  // simple diagonally dominant matrix (stable inverse)
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

const sizes = [32, 64, 128, 256, 512];

describe("gjInverse scaling", () => {
  for (const size of sizes) {
    const m = makeInvertibleMatrix(size);

    // warmup (important for stability)
    gjInverse(m);

    bench(`${size}x${size} gjInverse`, () => {
      gjInverse(m);
    });
  }
});
