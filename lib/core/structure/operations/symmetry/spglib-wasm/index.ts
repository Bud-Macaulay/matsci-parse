/**
 * Runtime bindings for the self-contained hand-rolled spglib WASM build.
 *
 * Retained only as a reference for the pure-TS Niggli reduction benchmark
 * (`niggli.bench.ts`). Production symmetry analysis goes through `../spglib`
 * (backed by `@spglib/moyo-wasm`).
 */

import initWasm from "./spglib_wasm.js";

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