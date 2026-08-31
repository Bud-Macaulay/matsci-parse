import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { minkowski } from "@/core/matrix/operations/reduction/minkowski";

function randomIntLattice(n: number, max = 6) {
  // Build a random integer basis by repeatedly adding small perturbed vectors,
  // which is full-rank with high probability.
  const data = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      data[i * n + j] = Math.floor(Math.random() * (2 * max + 1)) - max;
    }
  }
  // Force invertibility by adding a dominant diagonal.
  for (let i = 0; i < n; i++) data[i * n + i] += n * max;
  return createMatrix(n, n, data);
}

// Minkowski reduction enumerates over a coefficient hypercube, so it is only
// practical for small dimensions; bench 2×2, 3×3 and 4×4.
const sizes = [2, 3, 4];

describe("minkowski scaling", () => {
  for (const n of sizes) {
    const A = randomIntLattice(n);
    minkowski(A);

    bench(`${n}×${n} minkowski`, () => {
      minkowski(A);
    });
  }
});
