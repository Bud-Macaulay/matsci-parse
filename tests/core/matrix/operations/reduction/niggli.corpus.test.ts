import { describe, it, expect, beforeAll } from "vitest";
import { niggli } from "@/core/matrix/operations/reduction/niggli";
import { createMatrix } from "@/core/matrix/matrix";
import { buildCorpus } from "../../../../helpers/niggliCorpus";
import { init, niggli_reduce } from "@/core/structure/operations/symmetry/spglib-wasm";

const corpus = buildCorpus();

function det3(d: Float64Array): number {
  return (
    d[0] * (d[4] * d[8] - d[5] * d[7]) -
    d[1] * (d[3] * d[8] - d[5] * d[6]) +
    d[2] * (d[3] * d[7] - d[4] * d[6])
  );
}

describe("niggli vs spglib on the representative corpus", () => {
  beforeAll(async () => {
    await init();
  });

  it.each(
    corpus.flatMap((c) => c.cells.map((cell) => [c.name, cell.label, cell.data]) as const),
  )("matches spglib for %s %s", async (_cat, _label, data) => {
    const res = niggli(createMatrix(3, 3, new Float64Array(data)))!;
    const ref = await niggli_reduce(data.slice());
    expect(ref).not.toBeNull();
    for (let i = 0; i < 9; i++) {
      expect(Math.abs(res.basis.data[i] - (ref as number[])[i])).toBeLessThan(1e-6);
    }
  });
});

describe("niggli invariants on the corpus", () => {
  it.each(corpus.flatMap((c) => c.cells.map((cell) => [c.name, cell.label, cell.data]) as const))(
    "preserves volume, unimodularity and T·original = reduced for %s %s",
    (_cat, _label, data) => {
      const res = niggli(createMatrix(3, 3, new Float64Array(data)))!;
      const r = res.basis.data;
      const u = res.transform.data;
      const o = Float64Array.from(data);

      // Unimodular transform.
      expect(Math.abs(Math.abs(det3(u)) - 1)).toBeLessThan(1e-6);

      // reduced = T × original (rows).
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          let s = 0;
          for (let k = 0; k < 3; k++) s += u[i * 3 + k] * o[k * 3 + j];
          expect(Math.abs(r[i * 3 + j] - s)).toBeLessThan(1e-8);
        }

      // Volume preserved.
      expect(Math.abs(Math.abs(det3(r)) - Math.abs(det3(o)))).toBeLessThan(1e-6);
    },
  );
});
