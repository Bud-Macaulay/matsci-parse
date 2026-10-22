import { describe, it, expect } from "vitest";
import { getSymmetry } from "@/core/structure/operations/symmetry/spglib";
import { volume } from "@/core/structure/properties/volume";
import type { Structure } from "@/core/structure/structure";

import { ALL_STRUCTURES, type StructureName } from "../../../../fixtures/structures";

// [primitive sites, conventional sites]; volumes scale with the site counts.
// Corundum's conventional cell is the hexagonal setting (Z = 6).
const expected: Record<StructureName, [number, number]> = {
  poSC: [1, 1],
  wBCC: [1, 2],
  cuFCCPrimitive: [1, 4],
  cuFCC: [1, 4],
  siDiamond: [2, 8],
  csCl: [2, 2],
  naCl: [2, 8],
  srTiO3: [5, 5],
  tiO2Rutile: [6, 6],
  uAlpha: [2, 4],
  znOWurtzite: [4, 4],
  graphite: [4, 4],
  al2O3Corundum: [10, 30],
  zrO2Baddeleyite: [12, 12],
  triclinicP1: [3, 3],
  h2oBox: [3, 3],
};

function speciesSet(s: Structure) {
  return new Set(s.sites.map((x) => x.species.symbol));
}

describe("symmetry pipeline", () => {
  it.each(Object.entries(ALL_STRUCTURES) as [StructureName, Structure][])(
    "primitive and conventional cells: %s",
    async (name, s) => {
      const { primitive: prim, conventional: conv } = await getSymmetry(s);
      const [nPrim, nConv] = expected[name];

      expect(prim.sites.length).toBe(nPrim);
      expect(conv.sites.length).toBe(nConv);

      // Same density in every cell.
      const perSite = volume(s) / s.sites.length;
      expect(volume(prim)).toBeCloseTo(perSite * nPrim, 6);
      expect(volume(conv)).toBeCloseTo(perSite * nConv, 6);

      expect(speciesSet(prim)).toEqual(speciesSet(s));
      expect(speciesSet(conv)).toEqual(speciesSet(s));
    },
  );
});
