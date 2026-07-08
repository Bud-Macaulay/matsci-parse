import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { cholesky } from "@/core/matrix/operations/cholesky";
import { mul } from "@/core/matrix/operations/mul";
import { transpose } from "@/core/matrix/operations/transpose";

function makePDMatrix(size: number) {
  const M = createMatrix(size, size);
  const md = M.data;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      md[r * size + c] = r === c ? size + 1 : 0.5;
    }
  }

  return mul(transpose(M), M);
}

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
