import { bench, describe } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { niggli } from "@/core/matrix/operations/reduction/niggli";
import { init, niggli_reduce } from "@/core/structure/operations/symmetry/spglib-wasm";

function randomLattice(seed: number): number[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const d = new Float64Array(9);
  for (let i = 0; i < 9; i++) d[i] = (rnd() - 0.5) * 12;
  return Array.from(d);
}

const M = 200;
const lattices: number[][] = [];
for (let i = 0; i < M; i++) lattices.push(randomLattice(i + 1));
const matrices = lattices.map((l) => createMatrix(3, 3, new Float64Array(l)));

// Warm up the WASM module and the JIT before timing.
void init().then(() => niggli_reduce(lattices[0].slice()));
niggli(matrices[0]);

describe("niggli reduction", () => {
  bench(
    `TS niggli: ${M} triclinic cells`,
    () => {
      for (const m of matrices) niggli(m);
    },
  );

  bench(
    `wasm niggli_reduce: ${M} triclinic cells`,
    async () => {
      for (const l of lattices) await niggli_reduce(l.slice());
    },
  );
});
