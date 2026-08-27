import { describe, it, expect } from "vitest";
import { createLattice } from "@/core/lattice";
import { matchStructures } from "@/core/structure/operations/symmetry/matchStructures";
import type { Structure } from "@/core/structure";

import { getSymmetry } from "@/core/structure/operations/symmetry/spglib";

function makeStructure(
  positions: [number, number, number][],
  symbol = "Si",
): Structure {
  return {
    lattice: createLattice([3.57, 0, 0, 0, 3.57, 0, 0, 0, 3.57]),
    species: [{ symbol }],
    sites: positions.map((frac) => ({
      species: { symbol },
      frac: new Float64Array(frac),
    })),
  };
}

function makeSupercell2x2x2(structure: Structure): Structure {
  const sites = [];

  for (const site of structure.sites) {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 2; k++) {
          sites.push({
            species: site.species,
            frac: new Float64Array([
              (site.frac[0] + i) / 2,
              (site.frac[1] + j) / 2,
              (site.frac[2] + k) / 2,
            ]),
          });
        }
      }
    }
  }

  return {
    ...structure,
    lattice: createLattice([7.14, 0, 0, 0, 7.14, 0, 0, 0, 7.14]),
    sites,
  };
}

function addNoise(structure: Structure, amplitude: number): Structure {
  return {
    ...structure,
    sites: structure.sites.map((site, i) => ({
      ...site,
      frac: new Float64Array([
        site.frac[0] + (i % 3 === 0 ? amplitude : 0),
        site.frac[1] + (i % 3 === 1 ? amplitude : 0),
        site.frac[2] + (i % 3 === 2 ? amplitude : 0),
      ]),
    })),
  };
}

const structureA = makeStructure([
  [0.0, 0.0, 0.0],
  [0.25, 0.25, 0.25],
]);

const structureB = makeStructure([
  [1.0, 0.0, 0.0],
  [1.25, 0.25, 0.25],
]);

describe("matchStructures", () => {
  it("matches equivalent structures", async () => {
    const result = await matchStructures(structureA, structureB);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0);
    expect(result.maxDistance).toBeCloseTo(0);
  });

  it("does not match different compositions", async () => {
    const different = makeStructure(
      [
        [0.0, 0.0, 0.0],
        [0.25, 0.25, 0.25],
      ],
      "Ge",
    );

    const result = await matchStructures(structureA, different);

    expect(result.matches).toBe(false);
  });

  it("does not match different structures", async () => {
    const different = makeStructure([
      [0.0, 0.0, 0.0],
      [0.35, 0.35, 0.35],
    ]);

    const result = await matchStructures(structureA, different, 0.01);

    expect(result.matches).toBe(false);
    expect(result.rms).toBeNull();
    expect(result.maxDistance).toBeNull();
  });

  it("matches within positional tolerance", async () => {
    const slightlyDisplaced = makeStructure([
      [0.0, 0.0, 0.0],
      [0.252, 0.25, 0.25],
    ]);

    const result = await matchStructures(structureA, slightlyDisplaced, 0.3);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeGreaterThan(0);
    expect(result.maxDistance).toBeGreaterThan(0);
  });

  it("rejects structures outside positional tolerance", async () => {
    const displaced = makeStructure([
      [0.0, 0.0, 0.0],
      [0.35, 0.25, 0.25],
    ]);

    const result = await matchStructures(structureA, displaced, 0.01);

    expect(result.matches).toBe(false);
    expect(result.rms).toBeNull();
    expect(result.maxDistance).toBeNull();
  });

  it("standardizes equivalent structures consistently", async () => {
    const [a, b] = await Promise.all([
      getSymmetry(structureA),
      getSymmetry(structureB),
    ]);

    expect(a.primitive.sites.length).toBe(b.primitive.sites.length);
    expect(a.conventional.sites.length).toBe(b.conventional.sites.length);
  });
});

describe("supercell equivalence", () => {
  it("matches a primitive cell to its 2x2x2 supercell", async () => {
    const primitive = makeStructure([
      [0.0, 0.0, 0.0],
      [0.25, 0.25, 0.25],
    ]);

    const supercell = makeSupercell2x2x2(primitive);

    expect(primitive.sites.length).toBe(2);
    expect(supercell.sites.length).toBe(16);

    const result = await matchStructures(primitive, supercell);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0);
    expect(result.maxDistance).toBeCloseTo(0);
  });

  it("matches a 2x2x2 supercell to its primitive cell", async () => {
    const primitive = makeStructure([
      [0.0, 0.0, 0.0],
      [0.25, 0.25, 0.25],
    ]);

    const supercell = makeSupercell2x2x2(primitive);

    const result = await matchStructures(supercell, primitive);

    expect(result.matches).toBe(true);
  });

  it("matches two equivalent 2x2x2 supercells", async () => {
    const primitive = makeStructure([
      [0.0, 0.0, 0.0],
      [0.25, 0.25, 0.25],
    ]);

    const a = makeSupercell2x2x2(primitive);
    const b = makeSupercell2x2x2(primitive);

    const result = await matchStructures(a, b);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeCloseTo(0);
    expect(result.maxDistance).toBeCloseTo(0);
  });

  it("matches a slightly noisy supercell to the primitive cell", async () => {
    const primitive = makeStructure([
      [0.0, 0.0, 0.0],
      [0.25, 0.25, 0.25],
    ]);

    const noisyPrimitive = makeStructure([
      [0.0002, 0.0, 0.0],
      [0.25, 0.2502, 0.25],
    ]);

    const noisy = makeSupercell2x2x2(noisyPrimitive);

    const result = await matchStructures(primitive, noisy, 0.01);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeGreaterThan(0);
    expect(result.maxDistance).toBeGreaterThan(0);
    expect(result.maxDistance).toBeLessThan(0.01);
  });

  it("does not a significantly noisy supercell to the primitive cell", async () => {
    const primitive = makeStructure([
      [0.0, 0.0, 0.0],
      [0.25, 0.25, 0.25],
    ]);

    const noisyPrimitive = makeStructure([
      [0.0012, 0.0, 0.0],
      [0.25, 0.262, 0.25],
    ]);

    const noisy = makeSupercell2x2x2(noisyPrimitive);

    const result = await matchStructures(primitive, noisy, 0.01);

    expect(result.matches).toBe(false);
    expect(result.rms).toBeNull();
    expect(result.maxDistance).toBeNull();
  });

  it("matches the noisy supercell with wider tolerance 0.1", async () => {
    const primitive = makeStructure([
      [0.0, 0.0, 0.0],
      [0.25, 0.25, 0.25],
    ]);

    const noisyPrimitive = makeStructure([
      [0.0012, 0.0, 0.0],
      [0.25, 0.262, 0.25],
    ]);

    const noisy = makeSupercell2x2x2(noisyPrimitive);

    const result = await matchStructures(primitive, noisy, 0.1);

    expect(result.matches).toBe(true);
    expect(result.rms).toBeGreaterThan(0);
    expect(result.maxDistance).toBeGreaterThan(0);
    expect(result.maxDistance).toBeGreaterThan(0.01);
  });
});
