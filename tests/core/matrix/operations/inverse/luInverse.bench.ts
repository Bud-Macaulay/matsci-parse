import { bench, describe } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { luInverse } from "@/core/matrix/operations/inverse/luInverse";
import { makeInvertibleMatrix } from "../../../../helpers/matrix";

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
