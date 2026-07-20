import { describe, it, expect } from "vitest";
import { createMatrix } from "@/core/matrix/matrix";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { createLattice } from "@/core/lattice/lattice";
import { applyTransformationBasis } from "@/core/structure/operations/applyTransformationBasis";
import type { Structure } from "@/core/structure/structure";

function makeStructure(): Structure {
  return {
    lattice: createLattice([3, 4, 5]),
    sites: [
      { species: { symbol: "Si" }, frac: new Float64Array([0.0, 0.0, 0.0]) },
      { species: { symbol: "Si" }, frac: new Float64Array([0.5, 0.5, 0.5]) },
    ],
  };
}

describe("applyTransformationBasis", () => {
  it("identity matrix returns equivalent structure", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const result = applyTransformationBasis(s, P);

    for (let i = 0; i < 9; i++) {
      expect(result.lattice.basis.data[i]).toBeCloseTo(s.lattice.basis.data[i]);
    }

    expect(result.sites.length).toBe(s.sites.length);

    for (let i = 0; i < s.sites.length; i++) {
      for (let j = 0; j < 3; j++) {
        expect(result.sites[i].frac[j]).toBeCloseTo(s.sites[i].frac[j]);
      }
    }
  });

  it("2x diagonal doubles lattice and halves fractional coords", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [2, 0, 0, 0, 2, 0, 0, 0, 2]);
    const result = applyTransformationBasis(s, P);

    for (let i = 0; i < 9; i++) {
      expect(result.lattice.basis.data[i]).toBeCloseTo(
        s.lattice.basis.data[i] * 2,
      );
    }

    for (let i = 0; i < s.sites.length; i++) {
      for (let j = 0; j < 3; j++) {
        expect(result.sites[i].frac[j]).toBeCloseTo(s.sites[i].frac[j] / 2);
      }
    }
  });

  it("round-trip with inverse restores original", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 1, 0, 0, 2, 1, 1, 0, 3]);
    const intermediate = applyTransformationBasis(s, P);
    const Pinv = inverse3x3(P);
    const restored = applyTransformationBasis(intermediate, Pinv);

    for (let i = 0; i < 9; i++) {
      expect(restored.lattice.basis.data[i]).toBeCloseTo(
        s.lattice.basis.data[i],
        8,
      );
    }

    for (let i = 0; i < s.sites.length; i++) {
      for (let j = 0; j < 3; j++) {
        expect(restored.sites[i].frac[j]).toBeCloseTo(s.sites[i].frac[j], 8);
      }
    }
  });

  it("non-diagonal matrix transforms lattice correctly", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 1, 0, 0, 1, 0, 0, 0, 1]);
    const result = applyTransformationBasis(s, P);

    expect(result.lattice.basis.data[0]).toBeCloseTo(3);
    expect(result.lattice.basis.data[1]).toBeCloseTo(4);
    expect(result.lattice.basis.data[2]).toBeCloseTo(0);
    expect(result.lattice.basis.data[3]).toBeCloseTo(0);
    expect(result.lattice.basis.data[4]).toBeCloseTo(4);
    expect(result.lattice.basis.data[5]).toBeCloseTo(0);
    expect(result.lattice.basis.data[6]).toBeCloseTo(0);
    expect(result.lattice.basis.data[7]).toBeCloseTo(0);
    expect(result.lattice.basis.data[8]).toBeCloseTo(5);
  });

  it("throws on singular matrix", () => {
    const s = makeStructure();
    const P = createMatrix(3, 3, [1, 0, 0, 2, 0, 0, 0, 0, 1]);

    expect(() => applyTransformationBasis(s, P)).toThrow("Singular matrix");
  });

  it("preserves site species and properties", () => {
    const s: Structure = {
      lattice: createLattice([3, 4, 5]),
      sites: [
        {
          species: { symbol: "Fe", properties: { magneticMoment: 2.2 } },
          frac: new Float64Array([0.1, 0.2, 0.3]),
        },
      ],
    };
    const P = createMatrix(3, 3, [2, 0, 0, 0, 1, 0, 0, 0, 1]);
    const result = applyTransformationBasis(s, P);

    expect(result.sites[0].species.symbol).toBe("Fe");
    expect(result.sites[0].species.properties?.magneticMoment).toBe(2.2);
  });
});
