import { describe, expect, it } from "vitest";

import { fromPOSCAR } from "@/core/io/poscar";
import { cellMass } from "@/core/structure/properties/cellMass";

import { createLattice } from "@/core/lattice/lattice";
import { Structure } from "@/core/structure/structure";

import {
  simpleCubic,
  simpleHexagonal,
  layeredStructure,
  mc3d_10007,
  mc3d_1011,
  diamondCPOSCAR,
} from "../teststrings/spglibPoscar";

describe("cellMass", () => {
  it("simple cubic Na", () => {
    const s = fromPOSCAR(simpleCubic);

    expect(cellMass(s)).toBeCloseTo(22.99);
  });

  it("simple hexagonal Na", () => {
    const s = fromPOSCAR(simpleHexagonal);

    expect(cellMass(s)).toBeCloseTo(22.99);
  });

  it("diamond", () => {
    const s = fromPOSCAR(diamondCPOSCAR);

    expect(cellMass(s)).toBeCloseTo(48.044);
  });

  it("layered LiCoO2", () => {
    const s = fromPOSCAR(layeredStructure);

    expect(cellMass(s)).toBeCloseTo(6.94 + 58.933 + 2 * 15.999);
  });

  it("mc3d_10007", () => {
    const s = fromPOSCAR(mc3d_10007);

    expect(cellMass(s)).toBeCloseTo(16 * 118.71 + 4 * 102.91);
  });

  it("mc3d_1011", () => {
    const s = fromPOSCAR(mc3d_1011);

    expect(cellMass(s)).toBeCloseTo(
      6 * 6.94 + 2 * 40.078 + 2 * 54.938 + 6 * 14.007,
    );
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
