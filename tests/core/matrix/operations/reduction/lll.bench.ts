import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { lll } from "@/core/matrix/operations/reduction/lll";

function randomIntMatrix(n: number, max = 10) {
  const data = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) {
    data[i] = Math.floor(Math.random() * (2 * max + 1)) - max;
  }
  return createMatrix(n, n, data);
}

const sizes = [4, 8, 16, 32];

describe("lll scaling", () => {
  for (const n of sizes) {
    const A = randomIntMatrix(n);

    lll(A);

    bench(`${n}×${n} lll`, () => {
      lll(A);
    });
  }
});
