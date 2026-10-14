import { bench, describe } from "vitest";
import { createLattice } from "@/core/lattice/lattice";
import { supercell } from "@/core/structure/operations/supercell";
import { ewaldSum } from "@/core/structure/analysis/ewald/ewald";
import type { Structure } from "@/core/structure/structure";

// Rocksalt conventional cell (8 atoms, 4 NaCl pairs), tiled to size.
function rocksalt(rep: number): { s: Structure; q: number[] } {
  const base: Structure = {
    lattice: createLattice([5.64, 0, 0, 0, 5.64, 0, 0, 0, 5.64]),
    sites: [
      [0, 0, 0],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0, 0, 0.5],
      [0, 0.5, 0],
      [0.5, 0, 0],
    ].map((f, i) => ({
      species: { symbol: i < 4 ? "Na" : "Cl" },
      frac: new Float64Array(f),
    })),
  };
  const s = supercell(base, [rep, rep, rep]);
  const perSite = s.sites.length / base.sites.length;
  const q = base.sites.flatMap((_, i) => Array(perSite).fill(i < 4 ? 1 : -1));
  return { s, q };
}

describe("ewaldSum rocksalt supercells", () => {
  for (const rep of [1, 2, 3]) {
    const { s, q } = rocksalt(rep);
    bench(`rocksalt ${s.sites.length} atoms`, () => {
      ewaldSum(s, q);
    });
  }
});
