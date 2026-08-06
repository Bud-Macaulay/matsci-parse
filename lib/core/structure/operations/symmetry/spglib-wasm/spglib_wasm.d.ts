// Minimal type declaration for the emscripten-compiled spglib module.
// The runtime shape is fixed by EXPORTED_FUNCTIONS / EXPORTED_RUNTIME_METHODS.
declare const createModule: (moduleOverrides?: {
  wasmBinary?: ArrayBuffer | Uint8Array;
  locateFile?: (path: string) => string | URL;
}) => Promise<{
  HEAP8: Int8Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  UTF8ToString: (ptr: number) => string;
  _spglib_analyze_cell: (
    lattice: number,
    positions: number,
    numbers: number,
    n_atoms: number,
    symprec: number,
  ) => number;
  _spglib_free_string: (ptr: number) => void;
  _spglib_niggli_reduce: (lattice: number) => number;
}>;

export default createModule;
