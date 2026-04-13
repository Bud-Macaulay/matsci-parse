import init, { analyze_cell, type MoyoDataset } from "@spglib/moyo-wasm";
import { CrystalStructure } from "../io/crystal";
import { cartesianToFractional, fractionalToCartesian } from "../io/math";
import { PeriodicTable } from "../AtomicData";

/**
 * WASM singleton initialization
 */
let ready: Promise<void> | null = null;

// Slightly awkward handling to manage node vs browser invocation (for tests...)
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
 * Symbol → atomic number lookup (fast + safe)
 */
const SymbolToAtomicNumber = new Map<string, number>(
  Object.values(PeriodicTable).map((el) => [el.symbol, el.atomicNumber]),
);

const AtomicNumberToSymbol = new Map<number, string>(
  Object.values(PeriodicTable).map((el) => [el.atomicNumber, el.symbol]),
);

/**
 * Convert CrystalStructure → moyo-wasm input format
 */
function prepareCrystal(structure: CrystalStructure) {
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

  const positions = structure.sites.map((site) =>
    cartesianToFractional(site.cart, structure.lattice),
  );

  /**
   * Convert species → atomic numbers using speciesIndex
   */
  const numbers = structure.sites.map((site) => {
    const speciesSymbol = structure.species[site.speciesIndex];
    const atomicNumber = SymbolToAtomicNumber.get(speciesSymbol);
    if (atomicNumber === undefined) {
      throw new Error(`Unknown element symbol: ${speciesSymbol}`);
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

export function symToCrystal(dataset: MoyoDataset) {
  function build(cell: any): CrystalStructure {
    const { lattice, positions, numbers } = cell;

    // 1. Build unique species list
    const species = Array.from(
      new Set(
        numbers.map((n: number) => {
          const symbol = AtomicNumberToSymbol.get(n);
          if (!symbol) throw new Error(`Unknown atomic number: ${n}`);
          return symbol;
        }),
      ),
    );

    // 2. Build sites with correct speciesIndex
    const sites = positions.map((pos: number[], i: number) => {
      const symbol = AtomicNumberToSymbol.get(numbers[i]);
      if (!symbol) throw new Error(`Unknown atomic number: ${numbers[i]}`);

      return {
        speciesIndex: species.indexOf(symbol),
        cart: fractionalToCartesian(pos, lattice.basis),
      };
    });

    return new CrystalStructure({
      lattice: [
        [lattice.basis[0], lattice.basis[1], lattice.basis[2]],
        [lattice.basis[3], lattice.basis[4], lattice.basis[5]],
        [lattice.basis[6], lattice.basis[7], lattice.basis[8]],
      ],
      species,
      sites,
    });
  }

  return {
    primitive: build(dataset.prim_std_cell),
    conventional: build(dataset.std_cell),
  };
}
