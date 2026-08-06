/**
 * Runtime bindings for the self-contained spglib WASM build.
 *
 * Exposes the same MoyoDataset-shaped interface as `@spglib/moyo-wasm` so the
 * rest of the library can swap engines without changing its API.
 */

import initWasm from "./spglib_wasm.js";

export interface Lattice {
  basis: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

export interface MoyoCell {
  lattice: Lattice;
  positions: [number, number, number][];
  numbers: number[];
}

export interface MoyoDataset {
  number: number;
  hall_number: number;
  hm_symbol: string;
  operations: MoyoOperation[];
  orbits: number[];
  wyckoffs: string[];
  site_symmetry_symbols: string[];
  std_cell: MoyoCell;
  std_linear: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  std_origin_shift: [number, number, number];
  std_rotation_matrix: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  pearson_symbol: string;
  prim_std_cell: MoyoCell;
  prim_std_linear: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  prim_std_origin_shift: [number, number, number];
  mapping_std_prim: number[];
  symprec: number;
  angle_tolerance: { type: "Default" };
}

export interface MoyoOperation {
  rotation: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  translation: [number, number, number];
}

type Module = Awaited<ReturnType<typeof initWasm>> | null;

let ready: Promise<Module> | null = null;

/** Instantiate (and cache) the WASM module. Idempotent. */
export function init(): Promise<Module> {
  if (!ready) {
    ready = (async () => {
      const wasmUrl = new URL("spglib_wasm.wasm", import.meta.url);

      if (typeof process !== "undefined" && process.versions?.node) {
        const { readFileSync } = await import("fs");
        const { fileURLToPath } = await import("url");
        const wasmPath = fileURLToPath(wasmUrl);
        const wasmBinary = readFileSync(wasmPath);
        return (await initWasm({ wasmBinary })) as Module;
      }

      return (await initWasm({
        locateFile: () => wasmUrl.toString(),
      })) as Module;
    })();
  }
  return ready;
}

interface CellInput {
  lattice: { basis: number[] };
  positions: number[][];
  numbers: number[];
}

/** Analyze a cell and return a MoyoDataset-shaped result. */
export async function analyze_cell(
  cell_json: string,
  symprec: number,
  _setting = "Standard",
): Promise<MoyoDataset> {
  const mod = await init();
  if (!mod) throw new Error("spglib WASM module failed to initialize");

  const cell = JSON.parse(cell_json) as CellInput;
  const lattice = cell.lattice.basis;
  const positions = cell.positions;
  const numbers = cell.numbers;
  const n = positions.length;

  if (lattice.length !== 9 || positions.length !== n || numbers.length !== n) {
    throw new Error("spglib analyze_cell: malformed cell input");
  }

  const latPtr = mod._malloc(9 * 8);
  const posPtr = mod._malloc(n * 3 * 8);
  const numPtr = mod._malloc(n * 4);

  try {
    new Float64Array(mod.HEAP8.buffer, latPtr, 9).set(lattice);
    const posArr = new Float64Array(mod.HEAP8.buffer, posPtr, n * 3);
    for (let i = 0; i < n; i++) posArr.set(positions[i], i * 3);
    new Int32Array(mod.HEAP8.buffer, numPtr, n).set(numbers);

    const jsonPtr = mod._spglib_analyze_cell(
      latPtr,
      posPtr,
      numPtr,
      n,
      symprec,
    );
    if (!jsonPtr) throw new Error("spglib analyze_cell returned null");
    const json = mod.UTF8ToString(jsonPtr);
    mod._spglib_free_string(jsonPtr);
    return JSON.parse(json) as MoyoDataset;
  } finally {
    mod._free(latPtr);
    mod._free(posPtr);
    mod._free(numPtr);
  }
}

/**
 * Niggli-reduce a 3x3 lattice given row-major.
 * Returns the reduced lattice basis (9 numbers), or null on failure.
 */
export async function niggli_reduce(
  lattice: number[],
): Promise<number[] | null> {
  if (lattice.length !== 9)
    throw new Error("niggli_reduce: expected 9 numbers");
  const mod = await init();
  if (!mod) throw new Error("spglib WASM module failed to initialize");

  const latPtr = mod._malloc(9 * 8);
  try {
    new Float64Array(mod.HEAP8.buffer, latPtr, 9).set(lattice);
    const ok = mod._spglib_niggli_reduce(latPtr);
    if (!ok) return null;
    return Array.from(new Float64Array(mod.HEAP8.buffer, latPtr, 9));
  } finally {
    mod._free(latPtr);
  }
}
