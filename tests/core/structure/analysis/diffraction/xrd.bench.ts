import { bench, describe } from "vitest";
import { readFileSync } from "node:fs";
import { createLattice } from "@/core/lattice/lattice";
import { Structure } from "@/core/structure/structure";
import { calculateXrdPattern } from "@/core/structure/analysis/diffraction/xrd";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/xrd_fixtures.json", import.meta.url), "utf-8"),
) as Record<string, { structure: { lattice: number[][]; sites: { symbol: string; occu: number; frac: number[] }[] } }>;

function toStructure(name: string): Structure {
  const f = fixtures[name].structure;

  return {
    lattice: createLattice(f.lattice.flat()),
    sites: f.sites.map((s) => ({
      species: { symbol: s.symbol, properties: { occu: s.occu } },
      frac: [...s.frac],
    })),
  };
}

const cscl = toStructure("CsCl");
const lifepo4 = toStructure("LiFePO4");

describe("calculateXrdPattern", () => {
  bench("CsCl CuKa 0-90", () => {
    calculateXrdPattern(cscl);
  });

  bench("LiFePO4 CuKa 0-90", () => {
    calculateXrdPattern(lifepo4);
  });
});
