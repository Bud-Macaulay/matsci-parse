/* tslint:disable */
/* eslint-disable */
export interface Lattice {
    basis: [number, number, number, number, number, number, number, number, number];
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
    std_linear: [number, number, number, number, number, number, number, number, number];
    std_origin_shift: [number, number, number];
    std_rotation_matrix: [number, number, number, number, number, number, number, number, number];
    pearson_symbol: string;
    prim_std_cell: MoyoCell;
    prim_std_linear: [number, number, number, number, number, number, number, number, number];
    prim_std_origin_shift: [number, number, number];
    mapping_std_prim: number[];
    symprec: number;
    angle_tolerance: AngleTolerance;
}

export interface MoyoOperation {
    rotation: [number, number, number, number, number, number, number, number, number];
    translation: [number, number, number];
}

export type AngleTolerance = { type: "Radian"; value: number } | { type: "Default" };


/**
 * Return a strongly-typed DTO; wasm-bindgen + tsify will emit .d.ts based on these Rust types
 */
export function analyze_cell(cell_json: string, symprec: number, setting: string): MoyoDataset;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly analyze_cell: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
