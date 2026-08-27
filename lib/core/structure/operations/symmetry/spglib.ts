import { init, analyze_cell } from "./spglib-wasm";
import type { MoyoDataset } from "./spglib-wasm";

import { createLattice } from "@/core/lattice";
import { Structure } from "../../structure";

/** Ensure the WASM module is loaded (idempotent). */
export function initMoyo() {
  return init();
}

/** Serialize a structure into the Moyo/SPGLIB input representation. */
function toMoyoInput(structure: Structure): {
  lattice: { basis: number[] };
  positions: number[][];
  numbers: number[];
} {
  const symbolToId = new Map<string, number>();
  const numbers: number[] = [];
  const positions: number[][] = [];

  let counter = 0;

  for (const site of structure.sites) {
    const symbol = site.species.symbol;

    if (!symbolToId.has(symbol)) {
      symbolToId.set(symbol, counter);
      counter++;
    }

    positions.push(Array.from(site.frac));
    numbers.push(symbolToId.get(symbol)!);
  }

  return {
    lattice: { basis: Array.from(structure.lattice.basis.data) },
    positions,
    numbers,
  };
}

/** Run the symmetry engine on a structure and return the raw Moyo dataset. */
export async function analyzeStructure(
  structure: Structure,
  tolerance = 1e-4,
  setting = "Standard",
): Promise<MoyoDataset> {
  await initMoyo();
  return analyze_cell(
    JSON.stringify(toMoyoInput(structure)),
    tolerance,
    setting,
  );
}

/** Compute primitive and conventional structures plus calculation results via Moyo/SPGLIB. */
export async function getSymmetry(
  structure: Structure,
  tolerance = 1e-4,
  setting = "Standard",
): Promise<{
  primitive: Structure;
  conventional: Structure;
  calculationResults: MoyoDataset;
}> {
  await initMoyo();

  // -----------------------------
  // 1. Run symmetry engine
  // -----------------------------
  const results = await analyzeStructure(structure, tolerance, setting);

  // -----------------------------
  // 4. Convert Moyo cell → Structure
  // -----------------------------
  const symbolToId = new Map<string, number>();
  const idToSymbol = new Map<number, string>();

  {
    let counter = 0;
    for (const site of structure.sites) {
      const symbol = site.species.symbol;
      if (!symbolToId.has(symbol)) {
        symbolToId.set(symbol, counter);
        idToSymbol.set(counter, symbol);
        counter++;
      }
    }
  }

  function build(cell: {
    lattice: { basis: number[] };
    positions: number[][];
    numbers: number[];
  }): Structure {
    const { lattice, positions, numbers } = cell;

    const species = [...new Set(numbers)].map((n: number) => ({
      symbol: idToSymbol.get(n)!,
    }));

    const sites = positions.map((pos: number[], i: number) => ({
      species: {
        symbol: idToSymbol.get(numbers[i])!,
      },
      frac: new Float64Array(pos),
    }));

    return {
      lattice: createLattice(lattice.basis),
      species,
      sites,
    };
  }

  // -----------------------------
  // 5. Return both structures
  // -----------------------------
  return {
    primitive: build(results.prim_std_cell),
    conventional: build(results.std_cell),
    calculationResults: results,
  };
}
