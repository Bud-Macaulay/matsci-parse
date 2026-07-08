import { bench, describe } from "vitest";
import { hashStructure } from "@/core/structure/operations/hashStructure";
import { canonicalize } from "@/core/structure/operations/canonicalize";
import { createLattice } from "@/core/lattice/lattice";
import { supercell } from "@/core/structure/operations/supercell";
import { fromPOSCAR } from "@/core/io/poscar";
import { diamondCPOSCAR } from "../teststrings/spglibPoscar";

const cubic = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

const sizes = [1, 10, 100, 1000];

describe("hashStructure scaling", () => {
  for (const n of sizes) {
    const sites = Array.from({ length: n }, (_, i) => ({
      species: { symbol: i % 2 === 0 ? "A" : "B" },
      frac: new Float64Array([(i * 0.123) % 1, (i * 0.456) % 1, (i * 0.789) % 1]),
    }));

    const structure = { lattice: cubic, sites };

    hashStructure(structure);

    bench(`${n} sites hashStructure`, () => {
      hashStructure(structure);
    });
  }
});

describe("canonicalize scaling", () => {
  for (const n of sizes) {
    const sites = Array.from({ length: n }, (_, i) => ({
      species: { symbol: i % 2 === 0 ? "A" : "B" },
      frac: new Float64Array([(i * 0.123) % 1, (i * 0.456) % 1, (i * 0.789) % 1]),
    }));

    const structure = { lattice: cubic, sites };

    canonicalize(structure);

    bench(`${n} sites canonicalize`, () => {
      canonicalize(structure);
    });
  }
});

describe("supercell scaling", () => {
  const base = fromPOSCAR(diamondCPOSCAR);

  for (const n of [2, 4, 8] as const) {
    supercell(base, [n, n, n]);

    bench(`${n}x${n}x${n} supercell (${base.sites.length * n * n * n} sites)`, () => {
      supercell(base, [n, n, n]);
    });
  }
});
