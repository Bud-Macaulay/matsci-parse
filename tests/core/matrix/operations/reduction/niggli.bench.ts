import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { niggli } from "@/core/matrix/operations/reduction/niggli";
import { init, niggli_reduce } from "@/core/structure/operations/symmetry/spglib-wasm";
import { buildCorpus } from "../../../../helpers/niggliCorpus";

// Full API only. One representative cell per category keeps the benchmark quick
// while still covering easy, hard and convergence-heavy paths.
const corpus = buildCorpus();
const picks: { name: string; data: number[] }[] = [];
for (const cat of corpus) {
  picks.push({ name: cat.name, data: cat.cells[0].data });
}

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
