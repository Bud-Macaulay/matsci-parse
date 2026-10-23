import type { Structure } from "../../structure/structure";
import { createPhononBands, siteMasses, type PhononBands, type QPointLabel } from "../../phonon/phonon";
import { connectBands } from "../../phonon/operations/connectBands";
import { labelCorners } from "../../phonon/operations/labels";
import { fromPW, alatFromPW } from "../pw";
import { LengthUnitSystem } from "../../units/length";
import { LineReader } from "../helpers";
import { createMatrix } from "../../matrix/matrix";
import { mul } from "../../matrix/operations/mul";
import { scale } from "../../matrix/operations/scale";
import { transpose } from "../../matrix/operations/transpose";

/*
 * Readers for Quantum ESPRESSO phonon dispersions: the `flvec` file written
 * by matdyn.x (usually `matdyn.modes`), combined with the pw.x input that
 * defines the structure.
 */

const BOHR_TO_ANG = LengthUnitSystem.convert(1, "bohr", "angstrom");

/** The raw contents of a matdyn.x modes file, in the file's own units. */
export interface MatdynModes {
  nqpts: number;
  nmodes: number;
  /** [nqpts × 3]: Cartesian q-points in units of 2π/alat. */
  qpoints: Float64Array;
  /** [nqpts × nmodes]: frequencies in cm⁻¹. */
  frequencies: Float64Array;
  /** [nqpts × nmodes × nmodes/3 × 3 × 2]: complex displacement patterns. */
  eigenvectors: Float64Array;
}

const Q_LINE = /^\s*q\s*=\s*(\S+)\s+(\S+)\s+(\S+)/;
const FREQ_LINE = /^\s*(?:freq|omega)\s*\(\s*(\d+)\s*\)\s*=.*?=\s*(\S+)\s*\[cm-1\]/;

/** A real number, fixed-point or with an E or Fortran D exponent. */
const NUM = String.raw`([+-]?(?:\d+\.?\d*|\.\d+)(?:[eEdD][+-]?\d+)?)`;
/** One complex component, re im, optionally in its own parentheses. */
const PAIR = String.raw`\(?\s*${NUM}\s+${NUM}\s*\)?`;
/** An eigenvector row: the x, y, z components of one site, `( re im re im re im )`. */
const EIGENVECTOR_ROW = new RegExp(String.raw`^\s*${PAIR}\s+${PAIR}\s+${PAIR}\s*$`);

/**
 * Parse a matdyn.x modes file (`flvec`, e.g. matdyn.modes).
 *
 * Reads line by line with a {@link LineReader} rather than splitting the
 * text, so a large file is never duplicated as an array of lines.
 */
export function parseMatdynModes(text: string): MatdynModes {
  // First pass: count q-points, and size the modes from the first block
  // (modes are numbered 1..nmodes).
  let nqpts = 0;
  let nmodes = 0;
  const scan = new LineReader(text);
  let line: string | null;
  while ((line = scan.next()) !== null) {
    if (Q_LINE.test(line)) {
      if (++nqpts > 1) break;
    } else if (nqpts === 1) {
      const m = FREQ_LINE.exec(line);
      if (m) nmodes = Math.max(nmodes, +m[1]);
    }
  }
  while ((line = scan.next()) !== null) {
    if (Q_LINE.test(line)) nqpts++;
  }
  if (nqpts === 0) {
    throw new Error("No 'q =' lines found: not a matdyn.x modes file?");
  }
  if (nmodes === 0 || nmodes % 3 !== 0) {
    throw new Error(`Invalid number of modes (${nmodes}) in matdyn.x modes file`);
  }
  const nsites = nmodes / 3;

  const qpoints = new Float64Array(nqpts * 3);
  const frequencies = new Float64Array(nqpts * nmodes);
  const eigenvectors = new Float64Array(nqpts * nmodes * nmodes * 2);

  const r = new LineReader(text);
  let q = -1;
  let mode = nmodes;
  while ((line = r.next()) !== null) {
    const qm = Q_LINE.exec(line);
    if (qm) {
      checkModeCount(q, mode, nmodes);
      q++;
      mode = 0;
      for (let j = 0; j < 3; j++) qpoints[3 * q + j] = parseNumber(qm[j + 1], r.count);
      continue;
    }
    if (mode === nmodes) continue;
    const fm = FREQ_LINE.exec(line);
    if (!fm) continue;

    frequencies[q * nmodes + mode] = parseNumber(fm[2], r.count);
    let o = (q * nmodes + mode) * nmodes * 2;
    for (let s = 0; s < nsites; s++) {
      const row = r.next();
      const match = row === null ? null : EIGENVECTOR_ROW.exec(row);
      if (!match) {
        throw new Error(`Line ${r.count}: expected 6 numbers in eigenvector row, got '${row}'`);
      }
      for (let j = 0; j < 6; j++) eigenvectors[o++] = parseNumber(match[j + 1], r.count);
    }
    mode++;
  }
  checkModeCount(q, mode, nmodes);

  return { nqpts, nmodes, qpoints, frequencies, eigenvectors };
}

function checkModeCount(q: number, mode: number, nmodes: number): void {
  if (q >= 0 && mode !== nmodes) {
    throw new Error(`q-point ${q + 1}: expected ${nmodes} modes, found ${mode}`);
  }
}

/**
 * Parse a number, accepting Fortran D exponents (1.0D-03). matdyn.x writes
 * fixed-point numbers, so the D replacement is only a fallback for when
 * plain parsing fails.
 *
 * @param line - 1-based line number, for the error message.
 */
function parseNumber(s: string, line: number): number {
  let x = Number(s);
  if (Number.isNaN(x)) x = Number(s.replace(/[dD]/, "e"));
  if (!Number.isFinite(x) || s.trim() === "") {
    throw new Error(`Line ${line}: cannot parse number '${s}'`);
  }
  return x;
}

/**
 * Build PhononBands from a matdyn.x modes file and the structure it was
 * computed for. Modes keep the file's per-q-point order (ascending
 * frequency); see {@link connectBands} to follow branches through crossings.
 *
 * @param alat - pw.x's lattice parameter in Bohr, which the file's q-points
 *   are expressed in (see {@link alatFromPW} / {@link alatFromPWOutput}).
 */
export function fromMatdynModes(
  text: string,
  structure: Structure,
  opts: { alat: number; labels?: readonly QPointLabel[] },
): PhononBands {
  const modes = parseMatdynModes(text);
  const nsites = structure.sites.length;
  if (modes.nmodes !== 3 * nsites) {
    throw new Error(
      `The structure has ${nsites} atoms but the modes file has ${modes.nmodes / 3}`,
    );
  }

  // Cartesian (2π/alat) → fractional: q_frac_j = q_cart · a_j / (2π), and
  // the 2π cancels against the file's units, leaving a division by alat:
  // Q_frac = Q_cart · Aᵀ / alat.
  const alatAng = opts.alat * BOHR_TO_ANG;
  const qCart = createMatrix(modes.nqpts, 3, modes.qpoints);
  const qpoints = scale(mul(qCart, transpose(structure.lattice.basis)), 1 / alatAng).data;

  return createPhononBands({
    structure,
    qpoints,
    frequencies: modes.frequencies,
    eigenvectors: modes.eigenvectors,
    labels: opts.labels,
  });
}

/**
 * Read `alat` (Bohr) from a pw.x text output: the value pw.x actually used.
 *
 * When `structure` (parsed from the matching input) is given, the output is
 * checked against it: same number of atoms, and the same cell (the output's
 * "crystal axes" × alat, within the precision pw.x prints). The cell check
 * catches mismatched input/output files; alat itself may legitimately differ
 * from the one derived from the input (QE 4.x, see {@link alatFromPW}).
 */
export function alatFromPWOutput(text: string, structure?: Structure): number {
  const matches = [...text.matchAll(/lattice parameter \(alat\)\s*=\s*(\S+)\s*a\.u\./g)];
  if (matches.length === 0) {
    throw new Error("No 'lattice parameter (alat)' line found in pw.x output");
  }
  if (matches.length > 1) {
    throw new Error("Multiple alat lines in pw.x output: is this a vc-relax rather than an SCF?");
  }
  const alat = parseNumber(matches[0][1], 0);
  if (!structure) return alat;

  const nat = structure.sites.length;
  const natOut = /number of atoms\/cell\s*=\s*(\d+)/.exec(text);
  if (natOut && +natOut[1] !== nat) {
    throw new Error(`The pw.x input has ${nat} atoms but the output has ${natOut[1]}`);
  }

  const axes = [1, 2, 3].map((i) => {
    const m = new RegExp(`a\\(${i}\\)\\s*=\\s*\\(\\s*(\\S+)\\s+(\\S+)\\s+(\\S+)\\s*\\)`).exec(text);
    if (!m) throw new Error(`No crystal axis a(${i}) found in pw.x output`);
    return [m[1], m[2], m[3]].map((x) => parseNumber(x, 0) * alat * BOHR_TO_ANG);
  });
  const input = structure.lattice.basis.data;
  // pw.x prints alat to 4 decimals and the axes to 6: compare as numpy's
  // allclose(rtol=1e-4, atol=1e-4), like phonon-web-tools did.
  const same = axes.flat().every((x, k) => Math.abs(x - input[k]) <= 1e-4 + 1e-4 * Math.abs(input[k]));
  if (!same) {
    const fmt = (rows: ArrayLike<number>[]) => rows.map((r) => Array.from(r, (x) => x.toFixed(4)).join(" ")).join("; ");
    const inputRows = [0, 1, 2].map((i) => input.subarray(3 * i, 3 * i + 3));
    throw new Error(
      `The cell in the pw.x input (${fmt(inputRows)} Å) does not match the output (${fmt(axes)} Å): are these files from the same calculation?`,
    );
  }
  return alat;
}

/**
 * Read a QE phonon dispersion: the pw.x input (structure), the matdyn.x
 * modes file, and optionally the pw.x output. With the output, `alat` is
 * read from it and the files are checked for consistency; without it,
 * `alat` is derived from the input, which is exact for QE ≥ 5.0 (see
 * {@link alatFromPW}).
 *
 * Without explicit `labels`, the corners of the path get generic "Q_n"
 * labels; use {@link labelHighSymmetryPoints} to name them. Bands are
 * connected through crossings unless `connect` is false, using
 * periodic-table masses (pw.x inputs' ATOMIC_SPECIES masses are not read).
 */
export function fromQEPhonon(params: {
  pwInput: string;
  matdynModes: string;
  pwOutput?: string;
  labels?: readonly QPointLabel[];
  connect?: boolean;
}): PhononBands {
  const { pwInput, matdynModes, pwOutput, labels, connect = true } = params;
  const structure = fromPW(pwInput);
  const alat = pwOutput
    ? alatFromPWOutput(pwOutput, structure)
    : alatFromPW(pwInput);

  let bands = fromMatdynModes(matdynModes, structure, { alat, labels });
  if (!labels) bands = labelCorners(bands);
  // matdyn.modes holds displacement patterns: mass-weight them for overlaps
  return connect ? connectBands(bands, { masses: siteMasses(structure) }) : bands;
}
