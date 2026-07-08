import { bench, describe } from "vitest";

import { createMatrix } from "@/core/matrix/matrix";
import { gjInverse } from "@/core/matrix/operations/inverse/gaussJordan";
import { makeInvertibleMatrix } from "../../../../helpers/matrix";

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
