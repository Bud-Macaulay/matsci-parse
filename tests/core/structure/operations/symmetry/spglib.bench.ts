import { bench, describe } from "vitest";

import { fromXYZ } from "@/core/io/xyz";
import {
  getSymmetry,
  analyzeStructure,
} from "@/core/structure/operations/symmetry/spglib";
import { spaceGroupXYZ } from "../../../../helpers/bulkFiles/allSgn";

const structures = Object.entries(spaceGroupXYZ).map(([spg, xyz]) => ({
  key: spg,
  structure: fromXYZ(xyz),
}));

// BENCH_NS / BENCH_ITERS env vars let you scale the run (see matchStructures.bench.ts).
const NS = process.env.BENCH_NS
  ? process.env.BENCH_NS.split(",").map((n) => Number(n))
  : [50, structures.length];

const ITERS = process.env.BENCH_ITERS ? Number(process.env.BENCH_ITERS) : 4;

describe("getSymmetry (full pipeline)", () => {
  for (const n of NS) {
    const count = Math.min(n, structures.length);
    bench(
      `getSymmetry × ${count}`,
      async () => {
        for (let i = 0; i < count; i++) {
          await getSymmetry(structures[i].structure);
        }
      },
      { iterations: ITERS },
    );
  }
});

describe("analyzeStructure (wasm only, no Structure reconstruction)", () => {
  for (const n of NS) {
    const count = Math.min(n, structures.length);
    bench(
      `analyzeStructure × ${count}`,
      async () => {
        for (let i = 0; i < count; i++) {
          await analyzeStructure(structures[i].structure);
        }
      },
      { iterations: ITERS },
    );
  }
});
