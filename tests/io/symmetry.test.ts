import { describe, it, expect } from "vitest";
import { CrystalStructure } from "../../lib/main";
import { analyzeCrystal, symToCrystal } from "../../lib/symmetry/getSymmetry";

describe("prepareCrystal + mapping pipeline", () => {
  it("analyzes FCC aluminum structure", async () => {
    const a = 4.05;
    const structure = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [0, a, 0],
        [0, 0, a],
      ],
      species: ["Al"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [a / 2, a / 2, 0] },
        { speciesIndex: 0, cart: [a / 2, 0, a / 2] },
        { speciesIndex: 0, cart: [0, a / 2, a / 2] },
      ],
    });

    const result = await analyzeCrystal(structure);

    expect(result).toBeDefined();
    expect(result.number).toBeGreaterThan(0);
  });

  it("analyzes BCC iron structure", async () => {
    const a = 2.87; // Iron lattice constant in Angstroms
    const structure = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [0, a, 0],
        [0, 0, a],
      ],
      species: ["Fe"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [a / 2, a / 2, a / 2] },
      ],
    });

    const result = await analyzeCrystal(structure);

    expect(result).toBeDefined();
    expect(result.number).toBeGreaterThan(0);
  });

  it("analyzes NaCl (rock salt) structure", async () => {
    const a = 5.64; // NaCl lattice constant in Angstroms
    const structure = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [0, a, 0],
        [0, 0, a],
      ],
      species: ["Na", "Cl"],
      sites: [
        // Na FCC sublattice
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [a / 2, a / 2, 0] },
        { speciesIndex: 0, cart: [a / 2, 0, a / 2] },
        { speciesIndex: 0, cart: [0, a / 2, a / 2] },
        // Cl FCC sublattice (offset by a/2, a/2, a/2)
        { speciesIndex: 1, cart: [a / 2, 0, 0] },
        { speciesIndex: 1, cart: [0, a / 2, 0] },
        { speciesIndex: 1, cart: [0, 0, a / 2] },
        { speciesIndex: 1, cart: [a / 2, a / 2, a / 2] },
      ],
    });

    const result = await analyzeCrystal(structure);

    expect(result).toBeDefined();
    expect(result.number).toBeGreaterThan(0);
  });

  it("analyzes diamond cubic carbon structure", async () => {
    const a = 3.567; // Diamond lattice constant in Angstroms
    const structure = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [0, a, 0],
        [0, 0, a],
      ],
      species: ["C"],
      sites: [
        // FCC sublattice
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [a / 2, a / 2, 0] },
        { speciesIndex: 0, cart: [a / 2, 0, a / 2] },
        { speciesIndex: 0, cart: [0, a / 2, a / 2] },
        // Offset FCC sublattice (tetrahedral sites)
        { speciesIndex: 0, cart: [a / 4, a / 4, a / 4] },
        { speciesIndex: 0, cart: [(3 * a) / 4, (3 * a) / 4, a / 4] },
        { speciesIndex: 0, cart: [(3 * a) / 4, a / 4, (3 * a) / 4] },
        { speciesIndex: 0, cart: [a / 4, (3 * a) / 4, (3 * a) / 4] },
      ],
    });

    const result = await analyzeCrystal(structure);

    expect(result).toBeDefined();
    expect(result.number).toBeGreaterThan(0);
  });

  it("analyzes hexagonal graphite structure", async () => {
    const a = 2.46;
    const c = 6.71;
    const structure = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [-a / 2, (a * Math.sqrt(3)) / 2, 0],
        [0, 0, c],
      ],
      species: ["C"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [a / 2, (a * Math.sqrt(3)) / 6, 0] },
        { speciesIndex: 0, cart: [0, 0, c / 2] },
        { speciesIndex: 0, cart: [a / 2, (a * Math.sqrt(3)) / 6, c / 2] },
      ],
    });

    const result = await analyzeCrystal(structure);

    expect(result).toBeDefined();
    expect(result.number).toBeGreaterThan(0);
  });

  it("analyzes perovskite CaTiO3 structure", async () => {
    const a = 3.84;
    const structure = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [0, a, 0],
        [0, 0, a],
      ],
      species: ["Ca", "Ti", "O"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] }, // Ca at corners
        { speciesIndex: 1, cart: [a / 2, a / 2, a / 2] }, // Ti at body center
        { speciesIndex: 2, cart: [a / 2, a / 2, 0] }, // O at face centers
        { speciesIndex: 2, cart: [a / 2, 0, a / 2] },
        { speciesIndex: 2, cart: [0, a / 2, a / 2] },
      ],
    });

    const result = await analyzeCrystal(structure);

    expect(result).toBeDefined();
    expect(result.number).toBeGreaterThan(0);
  });

  it("produces primitive and conventional structures via symToCrystal", async () => {
    const a = 4.05;

    const structure = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [0, a, 0],
        [0, 0, a],
      ],
      species: ["Al"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [a / 2, a / 2, 0] },
        { speciesIndex: 0, cart: [a / 2, 0, a / 2] },
        { speciesIndex: 0, cart: [0, a / 2, a / 2] },
      ],
    });

    const sym = await analyzeCrystal(structure);
    const { primitive, conventional } = symToCrystal(sym);

    expect(primitive).toBeDefined();
    expect(conventional).toBeDefined();

    expect(primitive.numSites).toBeGreaterThan(0);
    expect(conventional.numSites).toBeGreaterThan(primitive.numSites);
  });

  it("round-trip: symCrystal", async () => {
    const a = 4.05;

    const original = new CrystalStructure({
      lattice: [
        [a, 0, 0],
        [0, a, 0],
        [0, 0, a],
      ],
      species: ["Al"],
      sites: [
        { speciesIndex: 0, cart: [0, 0, 0] },
        { speciesIndex: 0, cart: [a / 2, a / 2, 0] },
        { speciesIndex: 0, cart: [a / 2, 0, a / 2] },
        { speciesIndex: 0, cart: [0, a / 2, a / 2] },
      ],
    });

    const sym = await analyzeCrystal(original);
    const { primitive, conventional } = symToCrystal(sym);

    const reanalyzedPrimitive = await analyzeCrystal(primitive);
    const reanalyzedConventional = await analyzeCrystal(conventional);

    expect(reanalyzedPrimitive.number).toBe(sym.number);
    expect(reanalyzedPrimitive.hm_symbol).toBe(sym.hm_symbol);

    expect(reanalyzedConventional.number).toBe(sym.number);
    expect(reanalyzedConventional.hm_symbol).toBe(sym.hm_symbol);
  });
});
