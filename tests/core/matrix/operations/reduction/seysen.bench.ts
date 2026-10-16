import { bench, describe } from "vitest";
import { seysen } from "@/core/matrix/operations/reduction/seysen";
import { randomIntLattice, seededRandom } from "../../../../helpers/random";

const rng = seededRandom(2);

// Reduction cost depends strongly on the input, so average over a fixed set.
const LATTICES = 10;
const sizes = [4, 8, 16, 32];

describe("seysen scaling", () => {
  for (const n of sizes) {
    const lattices = Array.from({ length: LATTICES }, () =>
      randomIntLattice(rng, n, 6, n * 6),
    );
    for (const A of lattices) seysen(A);

    bench(`${n}×${n} seysen (${LATTICES} lattices)`, () => {
      for (const A of lattices) seysen(A);
    });
  }
});
