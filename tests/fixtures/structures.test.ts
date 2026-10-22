import { describe, it, expect } from "vitest";

import { ALL_STRUCTURES, type StructureName } from "./structures";
import type { Structure } from "@/core/structure/structure";
import { createMatrix } from "@/core/matrix/matrix";
import { determinant } from "@/core/matrix/operations/determinant";
import { volume } from "@/core/structure/properties/volume";
import { density } from "@/core/structure/properties/density";
import { reducedFormula } from "@/core/structure/properties/formula";
import { analyzeStructure, getSymmetry } from "@/core/structure/operations/symmetry/spglib";
import {
  getNeighbors,
  getCoordinationNumbers,
} from "@/core/structure/operations/neighbors";
import { getDistancesMatrix } from "@/core/structure/operations/distance/getDistancesMatrix";
import { supercell } from "@/core/structure/operations/supercell";
import { sortSites } from "@/core/structure/operations/sortSites";
import { perturb } from "@/core/structure/operations/perturb";
import { applyStrain } from "@/core/structure/operations/applyStrain";
import { applyTransformationBasis } from "@/core/structure/operations/applyTransformationBasis";
import { canonicalize } from "@/core/structure/operations/canonicalize";
import { hashStructure } from "@/core/structure/operations/hashStructure";
import { removeSite } from "@/core/structure/operations/sites/removeSite";
import { addVacuum } from "@/core/structure/operations/slab/addVacuum";
import { slabFromMillerIndex } from "@/core/structure/operations/slab/slabFromMillerIndex";

// Known properties of each fixture. Space groups are textbook values;
// volumes and nearest-neighbour distances agree with pymatgen.
const known: Record<
  StructureName,
  { spaceGroup: number; formula: string; volume: number; nn: number }
> = {
  poSC: { spaceGroup: 221, formula: "Po", volume: 37.899197279, nn: 3.359 }, // a^3, a
  wBCC: { spaceGroup: 229, formula: "W", volume: 31.7135334821, nn: 2.7412302106 }, // a√3/2
  cuFCCPrimitive: { spaceGroup: 225, formula: "Cu", volume: 11.8104083438, nn: 2.556191014 }, // a^3/4, a/√2
  cuFCC: { spaceGroup: 225, formula: "Cu", volume: 47.241633375, nn: 2.556191014 },
  siDiamond: { spaceGroup: 227, formula: "Si", volume: 160.191477991, nn: 2.351691984 }, // a√3/4
  csCl: { spaceGroup: 221, formula: "ClCs", volume: 74.565301329, nn: 3.6451009245 }, // a√3/2
  naCl: { spaceGroup: 225, formula: "ClNa", volume: 179.406144, nn: 2.82 }, // a/2
  srTiO3: { spaceGroup: 221, formula: "O3SrTi", volume: 59.547442625, nn: 1.9525 }, // a/2
  tiO2Rutile: { spaceGroup: 136, formula: "O2Ti", volume: 62.449209724, nn: 1.9482273038 },
  uAlpha: { spaceGroup: 63, formula: "U", volume: 82.99687433, nn: 2.7541902877 },
  znOWurtzite: { spaceGroup: 186, formula: "OZn", volume: 47.6304770562, nn: 1.9744246357 },
  graphite: { spaceGroup: 194, formula: "C", volume: 35.9280338244, nn: 1.4260551648 }, // a/√3
  al2O3Corundum: { spaceGroup: 167, formula: "Al2O3", volume: 84.9343503624, nn: 1.8540753715 },
  zrO2Baddeleyite: { spaceGroup: 14, formula: "O2Zr", volume: 140.8808121502, nn: 2.0519164072 },
  triclinicP1: { spaceGroup: 1, formula: "AsGaN", volume: 81.016, nn: 2.5710017503 },
  h2oBox: { spaceGroup: 25, formula: "H2O", volume: 1000, nn: 0.9572 }, // O–H bond
};

const entries = Object.entries(ALL_STRUCTURES) as [StructureName, Structure][];

describe("structure fixtures", () => {
  describe.each(entries)("%s", (name, s) => {
    const k = known[name];

    it("has the expected space group", async () => {
      expect((await analyzeStructure(s)).number).toBe(k.spaceGroup);
    });

    it("has the expected formula and volume", () => {
      expect(reducedFormula(s)).toBe(k.formula);
      expect(volume(s)).toBeCloseTo(k.volume, 8);
    });

    it("has the expected nearest-neighbour distance", () => {
      const nn = Math.min(
        ...s.sites.map((_, i) => getNeighbors(s, i, { cutoff: 6 })[0].distance),
      );
      expect(nn).toBeCloseTo(k.nn, 8);
    });

    it("is right-handed", () => {
      expect(determinant(s.lattice.basis)).toBeGreaterThan(0);
    });
  });
});

// Library operations must not mutate their inputs. Fixtures are frozen (so
// writes to sites/species/frac throw); the snapshot also covers the lattice.
describe("operations do not mutate their input", () => {
  const strain = createMatrix(3, 3, [0.01, 0, 0, 0, -0.02, 0, 0, 0, 0.03]);
  const shear = createMatrix(3, 3, [1, 1, 0, 0, 1, 0, 0, 0, 1]);

  const ops: [string, (s: Structure) => unknown][] = [
    ["supercell", (s) => supercell(s, [2, 1, 2])],
    ["sortSites", (s) => sortSites(s.sites)],
    ["perturb", (s) => perturb(s, 0.1)],
    ["applyStrain", (s) => applyStrain(s, strain)],
    ["applyTransformationBasis", (s) => applyTransformationBasis(s, shear)],
    ["canonicalize", (s) => canonicalize(s)],
    ["hashStructure", (s) => hashStructure(s)],
    ["getNeighbors", (s) => getNeighbors(s, 0, { cutoff: 4 })],
    ["getCoordinationNumbers", (s) => getCoordinationNumbers(s, { cutoff: 4 })],
    ["getDistancesMatrix", (s) => getDistancesMatrix(s)],
    ["density", (s) => density(s)],
    ["removeSite", (s) => removeSite(s, 0)],
    ["addVacuum", (s) => addVacuum(s, 10)],
    ["slabFromMillerIndex", (s) => slabFromMillerIndex(s, 1, 1, 0)],
    ["getSymmetry", (s) => getSymmetry(s)],
  ];

  describe.each(ops)("%s", (_, op) => {
    it.each(entries)("%s", async (_, s) => {
      const before = structuredClone(s);
      await op(s);
      expect(s).toEqual(before);
    });
  });
});
