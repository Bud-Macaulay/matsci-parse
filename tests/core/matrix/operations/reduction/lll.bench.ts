import { bench, describe } from "vitest";
import { lll } from "@/core/matrix/operations/reduction/lll";
import { randomIntLattice, seededRandom } from "../../../../helpers/random";

const rng = seededRandom(1);

// Reduction cost depends strongly on the input, so average over a fixed set.
const LATTICES = 10;
const sizes = [4, 8, 16, 32];

describe("lll scaling", () => {
  for (const n of sizes) {
    const lattices = Array.from({ length: LATTICES }, () =>
      randomIntLattice(rng, n, 10),
    );
    for (const A of lattices) lll(A);

    bench(`${n}×${n} lll (${LATTICES} lattices)`, () => {
      for (const A of lattices) lll(A);
    });
  }
});
