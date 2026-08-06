import { init, analyze_cell } from "./spglib-wasm";

import { createLattice } from "@/core/lattice";
import { Structure } from "../../structure";

/** Ensure the WASM module is loaded (idempotent). */
export function initMoyo() {
  return init();
}

/** Compute primitive and conventional structures plus calculation results via Moyo/SPGLIB. */
export async function getSymmetry(
  structure: Structure,
  tolerance = 1e-4,
  setting = "Standard",
): Promise<{
  primitive: Structure;
  conventional: Structure;
  calculationResults: any;
}> {
  await initMoyo();

  // -----------------------------
  // 1. Build reversible mapping
  // -----------------------------
  const symbolToId = new Map<string, number>();
  const idToSymbol = new Map<number, string>();

  let counter = 0;

  const positions: number[][] = [];
  const numbers: number[] = [];

  for (const site of structure.sites) {
    const symbol = site.species.symbol;

    if (!symbolToId.has(symbol)) {
      symbolToId.set(symbol, counter);
      idToSymbol.set(counter, symbol);
      counter++;
    }

    positions.push(Array.from(site.frac));
    numbers.push(symbolToId.get(symbol)!);
  }

  // -----------------------------
  // 2. Build Moyo input
  // -----------------------------
  const moyoInput = {
    lattice: {
      basis: Array.from(structure.lattice.basis.data),
    },
    positions,
    numbers,
  };

  // -----------------------------
  // 3. Run symmetry engine
  // -----------------------------
  const results = await analyze_cell(
    JSON.stringify(moyoInput),
    tolerance,
    setting,
  );

  // -----------------------------
  // 4. Convert Moyo cell → Structure
  // -----------------------------
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
