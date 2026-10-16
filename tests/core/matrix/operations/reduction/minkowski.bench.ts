import { bench, describe } from "vitest";
import { minkowski } from "@/core/matrix/operations/reduction/minkowski";
import { randomIntLattice, seededRandom } from "../../../../helpers/random";

const rng = seededRandom(3);

// Minkowski reduction enumerates over a coefficient hypercube, so it is only
// practical for small dimensions; bench 2×2, 3×3 and 4×4.
// Reduction cost depends strongly on the input, so average over a fixed set.
const LATTICES = 10;
const sizes = [2, 3, 4];

describe("minkowski scaling", () => {
  for (const n of sizes) {
    const lattices = Array.from({ length: LATTICES }, () =>
      randomIntLattice(rng, n, 6, n * 6),
    );
    for (const A of lattices) minkowski(A);

    bench(`${n}×${n} minkowski (${LATTICES} lattices)`, () => {
      for (const A of lattices) minkowski(A);
    });
  }
});
