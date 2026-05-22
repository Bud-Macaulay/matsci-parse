import init, { analyze_cell, type MoyoDataset } from "@spglib/moyo-wasm";

import { createLattice } from "@/core/lattice";
import { Structure } from "../../structure";

let ready: Promise<void> | null = null;

// Slightly awkward handling to manage node vs browser invocation (for tests...)
/**
 * Initializes the Moyo WASM module for symmetry analysis.
 *
 * This function is called automatically by getSymmetry(), but can be called
 * explicitly to pre-load the module.
 *
 * @returns A Promise that resolves when the WASM module is ready
 * @throws Error if WASM loading fails
 *
 * @remarks
 * - Handles both Node.js (filesystem-based WASM loading) and browser environments
 * - Module is loaded only once; subsequent calls return the same promise
 * - Required for symmetry operations with spglib
 *
 * @example
 * ```typescript
 * // Pre-load WASM for faster first symmetry call
 * await initMoyo();
 * const symmetry = await getSymmetry(structure);
 * ```
 */
export function initMoyo() {
  if (!ready) {
    ready = (async () => {
      // In Node.js (tests), load from filesystem
      if (typeof process !== "undefined" && process.versions?.node) {
        try {
          const { readFileSync } = await import("fs");
          const { join } = await import("path");
          const wasmPath = join(
            process.cwd(),
            "node_modules/@spglib/moyo-wasm/moyo_wasm_bg.wasm",
          );
          const wasmBuffer = readFileSync(wasmPath);
          await init(wasmBuffer);
        } catch (e) {
          console.error("Failed to load WASM in Node:", e);
          throw e;
        }
      } else {
        // In browser, use dynamic import to get the URL
        const wasmUrl = new URL(
          "@spglib/moyo-wasm/moyo_wasm_bg.wasm",
          import.meta.url,
        ).toString();

        await init(wasmUrl);
      }
    })();
  }
  return ready;
}

/**
 * Performs space group analysis on a crystal structure using spglib (Moyo WASM).
 *
 * Determines the symmetry of a structure and returns both the primitive and
 * conventional unit cells along with full symmetry analysis results.
 *
 * @param structure - The structure to analyze
 * @param tolerance - Symmetry tolerance in Ångströms (default: 1e-4)
 * @param setting - Choice of conventional cell setting (default: "Standard")
 * @returns An object containing:
 *   - `primitive`: The primitive unit cell
 *   - `conventional`: The conventional unit cell
 *   - `calculationResults`: Raw spglib/Moyo analysis data
 * @throws Error if WASM initialization fails
 *
 * @remarks
 * - Requires initialization of WASM module (handled automatically)
 * - Converts between atomic symbols and numeric IDs for Moyo
 * - Works in both Node.js (file-based WASM) and browsers (URL-based)
 * - Computationally expensive for large structures
 * - Uses Moyo WASM for accurate, efficient symmetry analysis
 *
 * @example
 * ```typescript
 * const structure = { lattice: cubic(4.05), sites: [...] };
 * const symmetry = await getSymmetry(structure, 1e-4, "Standard");
 * console.log(symmetry.primitive);
 * console.log(symmetry.conventional);
 * ```
 */
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
