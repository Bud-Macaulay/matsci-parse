import { createLattice } from "../../lattice/lattice";
import { cartesian } from "../../site/cartesian";
import { hillFormula } from "../../structure/properties/formula";
import { SymbolToAtomicNumber } from "../../data/periodictable/atomicData";
import {
  createPhononBands,
  type PhononBands,
  type QPointLabel,
} from "../../phonon/phonon";
import { mergeLabels, qpointDistances } from "../../phonon/operations/path";

/*
 * The PhononVis JSON format read by mc-react-phonon-visualizer and written
 * by the phonon-web-tools Python package. Every array is nested; distances
 * and merged labels are precomputed for plotting.
 */

/** A PhononVis JSON document. Lengths in Å, frequencies in cm⁻¹. */
export interface PhononVisData {
  name: string;
  natoms: number;
  /** Lattice vectors (rows), Å. */
  lattice: number[][];
  atom_types: string[];
  atom_numbers: number[];
  formula: string;
  /** Default supercell repetitions shown by the viewer. */
  repetitions: number[];
  atom_pos_car: number[][];
  atom_pos_red: number[][];
  /** [index, label]; path breaks are merged into one "A|B" entry. */
  highsym_qpts: [number, string][];
  /** Fractional reciprocal coordinates. */
  qpoints: number[][];
  /** Path length per q-point (Å⁻¹, no 2π), constant across breaks. */
  distances: number[];
  /** [q][mode], cm⁻¹. */
  eigenvalues: number[][];
  /** [q][mode][atom][xyz][re, im]. */
  vectors: number[][][][][];
}

/** Values below this magnitude are written as 0 (keeps the JSON small). */
const ZERO = 1e-8;

/**
 * Convert PhononBands to a PhononVis JSON document (as an object; use
 * JSON.stringify to serialize).
 *
 * @param opts.name - Display name; defaults to the Hill formula.
 * @param opts.repetitions - Default supercell; defaults to 3×3×3, or 5 along
 *   periodic and 1 along non-periodic directions when the path never leaves
 *   a plane (e.g. 5×5×1 for a 2D material).
 */
export function toPhononVis(
  bands: PhononBands,
  opts: { name?: string; repetitions?: number[] } = {},
): PhononVisData {
  const { structure, nqpts, nmodes } = bands;
  const nsites = structure.sites.length;
  const formula = hillFormula(structure);
  const symbols = structure.sites.map((s) => s.species.symbol);

  const distances = qpointDistances(bands);
  const eigenvalues: number[][] = [];
  const vectors: number[][][][][] = [];
  const vecSize = nmodes * 2;
  for (let q = 0; q < nqpts; q++) {
    eigenvalues.push(Array.from(bands.frequencies.subarray(q * nmodes, (q + 1) * nmodes), tidy));
    const modes: number[][][][] = [];
    for (let m = 0; m < nmodes; m++) {
      const o = (q * nmodes + m) * vecSize;
      const sites: number[][][] = [];
      for (let s = 0; s < nsites; s++) {
        const p = o + 6 * s;
        const e = bands.eigenvectors;
        sites.push([
          [tidy(e[p]), tidy(e[p + 1])],
          [tidy(e[p + 2]), tidy(e[p + 3])],
          [tidy(e[p + 4]), tidy(e[p + 5])],
        ]);
      }
      modes.push(sites);
    }
    vectors.push(modes);
  }

  const basis = structure.lattice.basis.data;
  return {
    name: opts.name ?? formula,
    natoms: nsites,
    lattice: [0, 1, 2].map((i) => Array.from(basis.subarray(3 * i, 3 * i + 3), tidy)),
    atom_types: symbols,
    atom_numbers: symbols.map((s) => {
      const z = SymbolToAtomicNumber.get(s);
      if (z === undefined) throw new Error(`Unknown element '${s}'`);
      return z;
    }),
    formula,
    repetitions: opts.repetitions ?? defaultRepetitions(bands),
    atom_pos_car: structure.sites.map((s) => Array.from(cartesian(structure.lattice, s), tidy)),
    atom_pos_red: structure.sites.map((s) => Array.from(s.frac, tidy)),
    highsym_qpts: mergeLabels(
      bands.labels.map((l) => (l.label === "GAMMA" ? { ...l, label: "Γ" } : l)),
    ).labels.map(({ index, label }) => [index, label]),
    qpoints: [...Array(nqpts)].map((_, q) => Array.from(bands.qpoints.subarray(3 * q, 3 * q + 3), tidy)),
    distances: Array.from(distances, tidy),
    eigenvalues,
    vectors,
  };
}

/**
 * Read a PhononVis JSON document (object or string). Merged "A|B" labels
 * are split back into a path break; `distances` is ignored, since it is
 * recomputed from the q-points.
 */
export function fromPhononVis(input: PhononVisData | string): PhononBands {
  const data: PhononVisData = typeof input === "string" ? JSON.parse(input) : input;
  for (const key of ["lattice", "atom_types", "atom_pos_red", "qpoints", "eigenvalues", "vectors"] as const) {
    if (!Array.isArray(data[key])) throw new Error(`PhononVis JSON is missing '${key}'`);
  }

  const structure = {
    lattice: createLattice(data.lattice.flat()),
    sites: data.atom_types.map((symbol, i) => ({
      species: { symbol },
      frac: Float64Array.from(data.atom_pos_red[i]),
    })),
  };

  const labels: QPointLabel[] = [];
  for (const [index, label] of data.highsym_qpts ?? []) {
    const parts = label.split("|");
    if (parts.length === 2) {
      labels.push({ index, label: parts[0] }, { index: index + 1, label: parts[1] });
    } else {
      labels.push({ index, label });
    }
  }

  const nqpts = data.qpoints.length;
  const nmodes = 3 * structure.sites.length;
  return createPhononBands({
    structure,
    qpoints: flatten(data.qpoints, 1, nqpts * 3),
    frequencies: flatten(data.eigenvalues, 1, nqpts * nmodes),
    eigenvectors: flatten(data.vectors, 4, nqpts * nmodes * nmodes * 2),
    labels,
  });
}

/**
 * Flatten `depth` levels of nested arrays into a Float64Array of the
 * expected `size`, written in place rather than through `Array.flat`
 * (which for the eigenvectors builds a JS array of millions of numbers).
 * On a size mismatch returns the plain flattened array instead, so that
 * {@link createPhononBands} reports the shape error.
 */
function flatten(nested: unknown[], depth: number, size: number): ArrayLike<number> {
  const out = new Float64Array(size);
  let n = 0;
  let ragged = false;
  // innermost level written inline: for the eigenvectors a call per
  // [re, im] pair would dominate
  const fill = (a: unknown, d: number): void => {
    if (!Array.isArray(a)) {
      ragged = true;
      return;
    }
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (d > 0) {
        fill(x, d - 1);
      } else if (Array.isArray(x)) {
        for (let j = 0; j < x.length; j++, n++) if (n < size) out[n] = x[j];
      } else {
        ragged = true;
      }
    }
  };
  fill(nested, depth - 1);
  return n === size && !ragged ? out : (nested.flat(depth) as ArrayLike<number>);
}

/**
 * 3×3×3 for a bulk path; otherwise 5 along each direction the q-points
 * vary in and 1 along the others.
 */
function defaultRepetitions(bands: PhononBands): number[] {
  const varies = [0, 1, 2].map((j) => {
    let sum = 0;
    for (let q = 0; q < bands.nqpts; q++) sum += bands.qpoints[3 * q + j];
    const mean = sum / bands.nqpts;
    for (let q = 0; q < bands.nqpts; q++) {
      if (Math.abs(bands.qpoints[3 * q + j] - mean) > 1e-5) return true;
    }
    return false;
  });
  return varies.every(Boolean) ? [3, 3, 3] : varies.map((v) => (v ? 5 : 1));
}

function tidy(x: number): number {
  return Math.abs(x) < ZERO ? 0 : x;
}
