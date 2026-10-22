import { describe, expect, it } from "vitest";

import { cellMass } from "@/core/structure/properties/cellMass";

import { createLattice } from "@/core/lattice/lattice";
import { Structure } from "@/core/structure/structure";

import {
  poSC,
  siDiamond,
  srTiO3,
  al2O3Corundum,
  zrO2Baddeleyite,
} from "../../../fixtures/structures";

describe("cellMass", () => {
  it("simple cubic Po", () => {
    expect(cellMass(poSC)).toBeCloseTo(209);
  });

  it("diamond Si", () => {
    expect(cellMass(siDiamond)).toBeCloseTo(8 * 28.0855);
  });

  it("perovskite SrTiO3", () => {
    expect(cellMass(srTiO3)).toBeCloseTo(87.62 + 47.867 + 3 * 15.9994);
  });

  it("corundum Al2O3", () => {
    expect(cellMass(al2O3Corundum)).toBeCloseTo(4 * 26.9815386 + 6 * 15.9994);
  });

  it("monoclinic ZrO2", () => {
    expect(cellMass(zrO2Baddeleyite)).toBeCloseTo(4 * 91.224 + 8 * 15.9994);
  });

  describe("cellMass overrides", () => {
    const lattice = createLattice([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    it("uses species mass override", () => {
      const s: Structure = {
        lattice,
        sites: [
          {
            species: {
              symbol: "C",
              properties: {
                mass: 100,
              },
            },
            frac: [0, 0, 0],
          },
        ],
      };

      expect(cellMass(s)).toBe(100);
    });

    it("uses site mass override over species mass", () => {
      const s: Structure = {
        lattice,
        sites: [
          {
            species: {
              symbol: "C",
              properties: {
                mass: 100,
              },
            },
            frac: [0, 0, 0],
            properties: {
              mass: 200,
            },
          },
        ],
      };

      expect(cellMass(s)).toBe(200);
    });

    it("sums site masses", () => {
      const s: Structure = {
        lattice,
        sites: [
          {
            species: { symbol: "C" },
            frac: [0, 0, 0],
            properties: { mass: 10 },
          },
          {
            species: { symbol: "C" },
            frac: [0, 0, 0],
            properties: { mass: 20 },
          },
        ],
      };

      expect(cellMass(s)).toBe(30);
    });

    it("throws for unknown element", () => {
      const s: Structure = {
        lattice,
        sites: [
          {
            species: { symbol: "Unobtainium" },
            frac: [0, 0, 0],
          },
        ],
      };

      expect(() => cellMass(s)).toThrow("Unknown element: Unobtainium");
    });
  });
});
