import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { cholesky } from "@/core/matrix/operations/cholesky";
import { makePDMatrix } from "../../../helpers/matrix";

const sizes = [8, 16, 32, 64, 128];

describe("cholesky scaling", () => {
  for (const n of sizes) {
    const A = makePDMatrix(n);

    cholesky(A);

    bench(`${n}x${n} cholesky`, () => {
      cholesky(A);
    });
  }
});
