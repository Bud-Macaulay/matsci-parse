import { bench, describe } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { getDistance } from "@/core/structure/operations/distance/getDistance";
import { getDistances } from "@/core/structure/operations/distance/getDistances";
import { getDistancesMatrix } from "@/core/structure/operations/distance/getDistancesMatrix";

const cubic = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

const sizes = [8, 32, 128];

describe("distance ops scaling", () => {
  for (const n of sizes) {
    const sites = Array.from({ length: n }, (_, i) => ({
      species: { symbol: "A" },
      frac: new Float64Array([(i * 0.123) % 1, (i * 0.456) % 1, (i * 0.789) % 1]),
    }));

    const structure = { lattice: cubic, sites };

    getDistance(structure, 0, 1);

    bench(`${n} sites getDistance (pair)`, () => {
      getDistance(structure, 0, 1);
    });

    getDistances(structure, 0);

    bench(`${n} sites getDistances from origin`, () => {
      getDistances(structure, 0);
    });

    if (n <= 32) {
      getDistancesMatrix(structure);

      bench(`${n} sites getDistancesMatrix`, () => {
        getDistancesMatrix(structure);
      });
    }
  }
});
