import { describe, it, expect } from "vitest";
import { fromPOSCAR, toPOSCAR } from "@/core/io/poscar";
import { getSymmetry } from "@/core/structure/operations/symmetry/spglib";
import {
  mc3d_10007,
  mc3d_1011,
  diamondCPOSCAR,
  layeredStructure,
} from "../../teststrings/spglibPoscar";

const fixtures = [
  ["Layered R-3m", layeredStructure],
  ["R-3", mc3d_1011],
  ["I41/acd", mc3d_10007],
  ["Diamond C", diamondCPOSCAR],
];

function speciesSet(s: any) {
  return new Set(s.sites.map((x: any) => x.species.symbol));
}

describe("POSCAR + symmetry pipeline", () => {
  for (const [name, input] of fixtures) {
    it(`symmetry consistency: ${name}`, async () => {
      const a = fromPOSCAR(input);

      const sym = await getSymmetry(a);

      const prim = sym.primitive;
      const conv = sym.conventional;

      // --- species consistency ---
      const aSet = speciesSet(a);
      const pSet = speciesSet(prim);
      const cSet = speciesSet(conv);

      expect(pSet).toEqual(aSet);
      expect(cSet).toEqual(aSet);

      // --- size relation (core symmetry invariant) ---
      expect(prim.sites.length).toBeGreaterThan(0);
      expect(conv.sites.length).toBeGreaterThan(0);

      expect(prim.sites.length).toBeLessThanOrEqual(conv.sites.length);
    });
  }
});
