import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { niggli } from "@/core/matrix/operations/reduction/niggli";
import { init, niggli_reduce } from "@/core/structure/operations/symmetry/spglib-wasm";

// Full API only. One fixed representative cell per category (random triclinic,
// already-reduced, highly-skewed, pathological) keeps the benchmark quick while
// still covering easy, hard and convergence-heavy paths. Deterministic by
// construction.
const picks: { name: string; data: number[] }[] = [
  {
    name: "random triclinic",
    data: [
      -11.956293404081972, 2.880276310667525, -5.012337681377463,
      7.921442994811314, 0.9359579146541472, 4.852068908909369,
      -5.887536046042822, -1.4361162136477028, -4.780182835077952,
    ],
  },
  { name: "already-reduced", data: [2, 0, 0, 0, 3, 0, 0, 0, 4] },
  { name: "highly-skewed", data: [15, 0, 0, 0.03, 2, 0, 0.02, 0.05, 1.5] },
  { name: "pathological", data: [4.0, 0.0, 0.0, 2.0, 4.34, 0.0, 1.0, 2.0, 5.7] },
];

const matrices = picks.map((p) => createMatrix(3, 3, new Float64Array(p.data)));
const latticeLists = picks.map((p) => p.data.slice());

// Warm up the WASM module and the JIT before timing.
void init().then(() => niggli_reduce(latticeLists[0].slice()));
for (const m of matrices) niggli(m);

describe("niggli reduction", () => {
  bench(
    `TS niggli (full API, ${picks.length} repr. cells)`,
    () => {
      for (const m of matrices) niggli(m);
    },
  );
  bench(
    `wasm niggli_reduce (${picks.length} repr. cells)`,
    async () => {
      for (const l of latticeLists) await niggli_reduce(l.slice());
    },
  );
});
