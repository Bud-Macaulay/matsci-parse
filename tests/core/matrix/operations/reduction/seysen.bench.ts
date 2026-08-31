import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { seysen } from "@/core/matrix/operations/reduction/seysen";

function randomIntLattice(n: number, max = 6) {
  const data = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      data[i * n + j] = Math.floor(Math.random() * (2 * max + 1)) - max;
    }
  }
  for (let i = 0; i < n; i++) data[i * n + i] += n * max;
  return createMatrix(n, n, data);
}

const sizes = [4, 8, 16, 32];

describe("seysen scaling", () => {
  for (const n of sizes) {
    const A = randomIntLattice(n);
    seysen(A);

    bench(`${n}×${n} seysen`, () => {
      seysen(A);
    });
  }
});
