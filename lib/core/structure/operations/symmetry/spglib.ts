/**
 * First-class symmetry engine backed by `@spglib/moyo-wasm`.
 *
 * This is the primary way to run structure-symmetry analysis in the library.
 * All `analyze_cell`/space-group work goes through the moyo WASM module here.
 * (The lattice Niggli reduction that seekpath used to obtain from the legacy
 * `spglib-wasm/` hand-rolled build is now a pure-TS implementation in
 * `matrix/operations/reduction/niggli.ts`.)
 *
 * `analyze_cell` is synchronous once the WASM is loaded; the async wrappers
 * below exist to await the one-time `init()` and keep the public API uniform.
 */

import init, { analyze_cell } from "@spglib/moyo-wasm";
import type { MoyoDataset } from "@spglib/moyo-wasm";

import { createLattice } from "@/core/lattice";
import { Structure } from "../../structure";

let ready: Promise<unknown> | null = null;

/** Ensure the Moyo WASM module is loaded (idempotent). */
export function initMoyo() {
  if (!ready) {
    ready = (async () => {
      // In Node.js (tests) read the wasm bytes from disk; the browser fetches
      // the URL that the package resolves for itself.
      if (typeof process !== "undefined" && process.versions?.node) {
        const { readFileSync } = await import("fs");
        const { createRequire } = await import("module");
        const require = createRequire(import.meta.url);
        const wasmPath = require.resolve(
          "@spglib/moyo-wasm/moyo_wasm_bg.wasm",
        );
        return await init({ module_or_path: readFileSync(wasmPath) });
      }
      return await init();
    })();
  }
  return ready;
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
  setting = "Spglib",
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
  setting = "Spglib",
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
  // 2. Build reversible mapping
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
  // 3. Return both structures
  // -----------------------------
  return {
    primitive: build(results.prim_std_cell),
    conventional: build(results.std_cell),
    calculationResults: results,
  };
}
