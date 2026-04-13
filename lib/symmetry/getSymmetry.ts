import init, { analyze_cell, type MoyoDataset } from "@spglib/moyo-wasm";
import wasmUrl from "moyo-wasm/moyo_wasm_bg.wasm?url";

import { CrystalStructure } from "../io/CrystalStructure";
import { cartesianToFractional } from "../io/math";
import { PeriodicTable } from "../AtomicData";

/**
 * WASM singleton initialization
 */
let ready: Promise<void> | null = null;

export function initMoyo() {
  if (!ready) {
    ready = init(wasmUrl);
  }
  return ready;
}

/**
 * Symbol → atomic number lookup (fast + safe)
 */
const SymbolToAtomicNumber = new Map<string, number>(
  Object.values(PeriodicTable).map((el) => [el.symbol, el.atomicNumber]),
);

/**
 * Convert CrystalStructure → moyo-wasm input format
 */
function prepareCrystal(structure: CrystalStructure) {
  /**
   * Flatten lattice (row-major 3x3 → 9-length vector)
   * Assumes structure.lattice is [ [x,y,z], [x,y,z], [x,y,z] ]
   */
  const basis = [
    structure.lattice[0][0],
    structure.lattice[0][1],
    structure.lattice[0][2],
    structure.lattice[1][0],
    structure.lattice[1][1],
    structure.lattice[1][2],
    structure.lattice[2][0],
    structure.lattice[2][1],
    structure.lattice[2][2],
  ];

  /**
   * Convert Cartesian → fractional coordinates
   */
  const positions = structure.sites.map((site) =>
    cartesianToFractional(site.cart, structure.lattice),
  );

  /**
   * Convert species → atomic numbers
   */
  const numbers = structure.sites.map((site) => {
    const atomicNumber = SymbolToAtomicNumber.get(site.species);

    if (atomicNumber === undefined) {
      throw new Error(`Unknown element symbol: ${site.species}`);
    }

    return atomicNumber;
  });

  return {
    lattice: { basis },
    positions,
    numbers,
  };
}

/**
 * Analyze a crystal structure using moyo-wasm
 */
export async function analyzeCrystal(
  structure: CrystalStructure,
  tolerance = 1e-4,
  setting: "Standard" | string = "Standard",
): Promise<MoyoDataset> {
  await initMoyo();

  const cell = prepareCrystal(structure);

  return analyze_cell(JSON.stringify(cell), tolerance, setting);
}
