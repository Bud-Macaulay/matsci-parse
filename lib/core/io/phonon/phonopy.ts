import { createLattice } from "../../lattice/lattice";
import { reciprocalLatticeCrystallographic } from "../../lattice/reciprocalLatticeCrystallographic";
import type { Structure } from "../../structure/structure";
import {
  createPhononBands,
  siteMass,
  type PhononBands,
  type QPointLabel,
} from "../../phonon/phonon";
import { qpointDistances } from "../../phonon/operations/path";
import { FrequencyUnitSystem } from "../../units/frequency";
import { LengthUnitSystem } from "../../units/length";
import { LineReader } from "../helpers";

/*
 * phonopy's band structure output, `band.yaml` (written by `phonopy` with a
 * BAND = ... setting, with eigenvectors when EIGENVECTORS = .TRUE.).
 *
 * The path is a list of segments, each sampled end to end, so a q-point
 * shared by two connected segments appears twice. `labels` holds one
 * [start, end] pair per segment; older versions (e.g. 1.x)
 * instead attach a `label:` to the q-points at segment ends.
 *
 * q-points are fractional in the reciprocal of the `lattice` written in the
 * file: phonopy's primitive cell (PRIMITIVE_AXES applied), which is
 * therefore the structure of the resulting PhononBands. Frequencies are in
 * THz (phonopy's default; a FREQUENCY_CONVERSION_FACTOR changes them and is
 * not recorded in the file).
 *
 * The parser follows the fixed layout phonopy writes rather than general
 * YAML: a file re-dumped by another YAML library (flow style, reordered
 * keys) is not supported.
 */

const THZ_TO_CM = FrequencyUnitSystem.convert(1, "THz", "cm-1");
const BOHR_TO_ANG = LengthUnitSystem.convert(1, "bohr", "angstrom");

/** The raw contents of a phonopy band.yaml, in the file's own units. */
export interface PhonopyBandYaml {
  nqpts: number;
  natoms: number;
  /** Number of q-points in each path segment; they sum to `nqpts`. */
  segmentNqpts: number[];
  /** [start, end] label of each segment (`labels`), or null if absent. */
  segmentLabels: [string, string][] | null;
  /** Per-q-point `label:` entries written by older phonopy versions. */
  qpointLabels: QPointLabel[];
  /** `calculator` from the file's comment block (only written for non-VASP). */
  calculator: string | null;
  /** `length_unit` from the comment block: "au" (Bohr) or "angstrom". */
  lengthUnit: string | null;
  /** [3 × 3]: lattice vectors as rows, in `lengthUnit` (Å if absent). */
  lattice: number[];
  symbols: string[];
  /** [natoms × 3]: fractional coordinates. */
  positions: number[];
  /** Atomic masses (amu), as used by phonopy. */
  masses: number[];
  /** [nqpts × 3]: fractional reciprocal coordinates of each q-point. */
  qpoints: Float64Array;
  /** [nqpts]: phonopy's path length (crystallographic, no 2π). */
  distances: Float64Array;
  /** [nqpts × nmodes]: frequencies in THz. */
  frequencies: Float64Array;
  /**
   * [nqpts × nmodes × natoms × 3 × 2]: complex eigenvectors of the
   * dynamical matrix, or null when the file has none (EIGENVECTORS unset).
   */
  eigenvectors: Float64Array | null;
}

const TOP_KEY = /^([A-Za-z_][\w-]*):\s*(.*)$/;
const QUOTED = /'((?:[^']|'')*)'|"((?:[^"\\]|\\.)*)"/g;

/** Parse a phonopy band.yaml into its raw contents. */
export function parsePhonopyBandYaml(text: string): PhonopyBandYaml {
  // Read line by line rather than splitting: band.yaml with eigenvectors
  // runs to hundreds of MB. Error messages use 0-based `r.count - 1`.
  const r = new LineReader(text);
  let raw: string | null;

  // ---- header: top-level keys up to `phonon:` ----
  let nqpts = -1;
  let natomsDeclared = -1;
  let calculator: string | null = null;
  let lengthUnit: string | null = null;
  const segmentNqpts: number[] = [];
  let segmentLabels: [string, string][] | null = null;
  const lattice: number[] = [];
  const symbols: string[] = [];
  const positions: number[] = [];
  const masses: number[] = [];

  let key = "";
  let foundPhonon = false;
  while ((raw = r.next()) !== null) {
    const i = r.count - 1;
    const line = raw.trimEnd();
    if (line === "" || line.startsWith("#")) continue;
    const top = TOP_KEY.exec(line);
    if (top) {
      key = top[1];
      const value = stripComment(top[2]);
      if (key === "phonon") {
        foundPhonon = true;
        break;
      }
      if (key === "nqpoint") nqpts = parseInteger(value, i);
      else if (key === "natom") natomsDeclared = parseInteger(value, i);
      else if (key === "calculator") calculator = value;
      else if (key === "length_unit") lengthUnit = value;
      else if (key === "labels") segmentLabels = [];
      continue;
    }
    const item = line.trimStart();
    if (key === "segment_nqpoint" && item.startsWith("- ")) {
      segmentNqpts.push(parseInteger(stripComment(item.slice(2)), i));
    } else if (key === "labels" && item.startsWith("- ")) {
      const pair = unquoteAll(item);
      if (pair.length !== 2) {
        throw new Error(`Line ${i + 1}: expected a pair of labels, got '${item}'`);
      }
      segmentLabels!.push([pair[0], pair[1]]);
    } else if (key === "lattice" && item.startsWith("- [")) {
      lattice.push(...parseVector(item, 3, i));
    } else if (key === "points") {
      if (item.startsWith("- symbol:")) {
        symbols.push(stripComment(item.slice(9)));
      } else if (item.startsWith("coordinates:")) {
        positions.push(...parseVector(item, 3, i));
      } else if (item.startsWith("mass:")) {
        masses.push(parseNumber(stripComment(item.slice(5)), i));
      }
    }
  }
  if (!foundPhonon) {
    throw new Error("No 'phonon:' section found: not a phonopy band.yaml?");
  }
  if (lattice.length !== 9) {
    throw new Error(`Expected 3 lattice vectors in band.yaml, got ${lattice.length / 3}`);
  }
  const natoms = symbols.length;
  if (natoms === 0 || positions.length !== 3 * natoms) {
    throw new Error("band.yaml 'points' must give a symbol and coordinates for every atom");
  }
  if (natomsDeclared >= 0 && natomsDeclared !== natoms) {
    throw new Error(`band.yaml declares natom: ${natomsDeclared} but lists ${natoms} points`);
  }
  if (masses.length !== natoms) masses.length = 0;

  // ---- phonon: one block per q-point ----
  // Sized up front by searching the text, so nothing is held per line.
  const found = countOccurrences(text, "\n- q-position:");
  if (nqpts < 0) nqpts = found;
  if (found !== nqpts) {
    throw new Error(`band.yaml declares nqpoint: ${nqpts} but contains ${found} q-points`);
  }
  if (segmentNqpts.length === 0) segmentNqpts.push(nqpts);
  if (segmentNqpts.reduce((a, b) => a + b, 0) !== nqpts) {
    throw new Error(`segment_nqpoint (${segmentNqpts.join(", ")}) does not add up to nqpoint: ${nqpts}`);
  }
  if (segmentLabels && segmentLabels.length !== segmentNqpts.length) {
    throw new Error(`band.yaml has ${segmentLabels.length} label pairs for ${segmentNqpts.length} segments`);
  }

  const nmodes = 3 * natoms;
  const rows = nmodes; // eigenvector rows ([re, im]) per mode
  const withEigenvectors = /^\s*eigenvector:/m.test(text);

  const qpoints = new Float64Array(nqpts * 3);
  const distances = new Float64Array(nqpts);
  const frequencies = new Float64Array(nqpts * nmodes);
  const eigenvectors = withEigenvectors ? new Float64Array(nqpts * nmodes * nmodes * 2) : null;
  const qpointLabels: QPointLabel[] = [];

  let q = -1;
  let mode = nmodes - 1;
  let row = rows;
  const finishQPoint = () => {
    if (q < 0) return;
    if (mode !== nmodes - 1) {
      throw new Error(`q-point ${q + 1}: expected ${nmodes} modes, found ${mode + 1}`);
    }
    if (eigenvectors && row !== rows) {
      throw new Error(`q-point ${q + 1}, mode ${nmodes}: expected ${rows} eigenvector rows, got ${row}`);
    }
  };

  while ((raw = r.next()) !== null) {
    const j = r.count - 1;
    if (raw.startsWith("- q-position:")) {
      finishQPoint();
      q++;
      qpoints.set(parseVector(raw, 3, j), 3 * q);
      mode = -1;
      row = rows;
      continue;
    }
    if (q < 0) continue;
    // match on the indented content without allocating a trimmed copy:
    // eigenvector rows are nearly all of the file
    let k = 0;
    while (raw.charCodeAt(k) === 32) k++;
    if (raw.startsWith("- [", k)) {
      if (!eigenvectors || mode < 0 || row >= rows) {
        throw new Error(`Line ${j + 1}: unexpected eigenvector row`);
      }
      const o = ((q * nmodes + mode) * rows + row) * 2;
      const c = raw.indexOf(",", k);
      const b = raw.indexOf("]", c);
      if (c < 0 || b < 0) throw new Error(`Line ${j + 1}: expected [re, im], got '${raw.trim()}'`);
      eigenvectors[o] = parseNumber(raw.slice(k + 3, c), j);
      eigenvectors[o + 1] = parseNumber(raw.slice(c + 1, b), j);
      row++;
    } else if (raw.startsWith("frequency:", k)) {
      if (eigenvectors && mode >= 0 && row !== rows) {
        throw new Error(`q-point ${q + 1}, mode ${mode + 1}: expected ${rows} eigenvector rows, got ${row}`);
      }
      mode++;
      if (mode >= nmodes) {
        throw new Error(`q-point ${q + 1}: more than ${nmodes} modes`);
      }
      frequencies[q * nmodes + mode] = parseNumber(raw.slice(k + 10), j);
      row = 0;
    } else if (raw.startsWith("distance:", k)) {
      distances[q] = parseNumber(raw.slice(k + 9), j);
    } else if (raw.startsWith("label:", k)) {
      const t = raw.slice(k);
      qpointLabels.push({ index: q, label: unquoteAll(t)[0] ?? t.slice(6).trim() });
    }
  }
  finishQPoint();

  return {
    nqpts,
    natoms,
    segmentNqpts,
    segmentLabels,
    qpointLabels,
    calculator,
    lengthUnit,
    lattice,
    symbols,
    positions,
    masses,
    qpoints,
    distances,
    frequencies,
    eigenvectors,
  };
}

/**
 * Build PhononBands from a phonopy band.yaml.
 *
 * - Structure: phonopy's primitive cell from the file (the cell the
 *   q-points refer to), with each site's phonopy mass in
 *   `properties.mass`. Lengths are converted to Å when the file says
 *   `length_unit: au` (QE, ABINIT, ... interfaces) or `opts.lengthUnit`
 *   says so.
 * - Frequencies: THz → cm⁻¹.
 * - Eigenvectors: phonopy writes the eigenvectors of the dynamical matrix,
 *   i.e. mass-weighted (displacement u ∝ e / √m), normalized over the cell,
 *   unlike matdyn.x's displacement patterns. They are stored as written.
 *   Without eigenvectors in the file (EIGENVECTORS not set) they are all
 *   zero, so frequencies can still be plotted; check
 *   {@link parsePhonopyBandYaml}'s `eigenvectors` for null to tell.
 * - Labels: segment end labels become q-point labels; the duplicated
 *   q-point joining two connected segments carries the same label twice
 *   (no break), while a jump gives two different labels (a break). Without
 *   any labels, segment ends get generic "Q_n" labels shared by visits to
 *   the same q-point, so path breaks are kept. LaTeX labels ("$\Gamma$",
 *   "$\mathrm{X}$") and GAMMA are converted to plain text / "Γ".
 *   A segment sampled by only its two end points (BAND_POINTS = 2) has
 *   two consecutive different labels, which PhononBands reads as a break.
 *
 * Modes keep the file's order (ascending frequency unless phonopy ran with
 * BAND_CONNECTION); see `connectBands` to follow branches.
 */
export function fromPhonopyBandYaml(
  text: string,
  opts: { lengthUnit?: "angstrom" | "au" } = {},
): PhononBands {
  const raw = parsePhonopyBandYaml(text);
  const unit = (opts.lengthUnit ?? raw.lengthUnit ?? "angstrom").toLowerCase();
  if (unit !== "angstrom" && unit !== "au" && unit !== "bohr") {
    throw new Error(`Unsupported band.yaml length_unit '${unit}'`);
  }
  const scale = unit === "angstrom" ? 1 : BOHR_TO_ANG;

  const structure: Structure = {
    lattice: createLattice(raw.lattice.map((x) => x * scale)),
    sites: raw.symbols.map((symbol, s) => ({
      species: { symbol },
      frac: raw.positions.slice(3 * s, 3 * s + 3),
      ...(raw.masses.length > 0 ? { properties: { mass: raw.masses[s] } } : {}),
    })),
  };

  const nmodes = 3 * raw.natoms;
  return createPhononBands({
    structure,
    qpoints: raw.qpoints,
    frequencies: raw.frequencies.map((f) => f * THZ_TO_CM),
    eigenvectors: raw.eigenvectors ?? new Float64Array(raw.nqpts * nmodes * nmodes * 2),
    labels: pathLabels(raw),
  });
}

/** q-point labels from segment label pairs, legacy per-q labels, or q-point identity. */
function pathLabels(raw: PhonopyBandYaml): QPointLabel[] {
  const ends: [number, number][] = [];
  let start = 0;
  for (const n of raw.segmentNqpts) {
    if (n > 0) ends.push([start, start + n - 1]);
    start += n;
  }

  const labelled = new Map<number, string>();
  if (raw.segmentLabels) {
    raw.segmentLabels.forEach(([a, b], k) => {
      if (!ends[k]) return;
      labelled.set(ends[k][0], a);
      labelled.set(ends[k][1], b);
    });
  } else if (raw.qpointLabels.length > 0) {
    for (const { index, label } of raw.qpointLabels) labelled.set(index, label);
  } else if (ends.length > 1) {
    // No labels: name segment ends by q-point, so a jump (different
    // q-points) still reads as a break and a joint (same q-point) does not.
    const named: { q: number; label: string }[] = [];
    for (const index of ends.flat()) {
      const known = named.find(({ q }) => sameQPoint(raw.qpoints, q, index));
      const label = known?.label ?? `Q_${named.length + 1}`;
      if (!known) named.push({ q: index, label });
      labelled.set(index, label);
    }
  }

  return [...labelled]
    .map(([index, label]) => ({ index, label: normalizeLabel(label) }))
    .filter(({ label }) => label !== "")
    .sort((a, b) => a.index - b.index);
}

const GREEK: Record<string, string> = {
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ",
  eta: "η", theta: "θ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
};

/**
 * Plain-text label from phonopy's: "$\Gamma$" → "Γ", "$\mathrm{X}$" → "X",
 * "$\Sigma_0$" → "Σ_0", "GAMMA" / "Gamma" → "Γ" (also SIGMA, DELTA, LAMBDA,
 * the seekpath names phonopy converts for plotting).
 */
function normalizeLabel(label: string): string {
  let s = label.trim();
  if (s.length >= 2 && s.startsWith("$") && s.endsWith("$")) s = s.slice(1, -1).trim();
  s = s
    .replace(/\\(?:mathrm|rm|textrm|text)\s*\{([^}]*)\}/g, "$1")
    .replace(/_\{([^}]*)\}/g, "_$1")
    .replace(/\\([A-Za-z]+)/g, (m, name: string) => GREEK[name] ?? m);
  return s.replace(/^(GAMMA|SIGMA|DELTA|LAMBDA|Gamma)(?=_|$)/, (w) => GREEK[w[0] + w.slice(1).toLowerCase()]);
}

/**
 * Write PhononBands as a phonopy band.yaml, in the layout phonopy itself
 * writes (frequencies in THz, lattice in Å, no comment block), readable by
 * phonopy-bandplot and other band.yaml consumers.
 *
 * The path is split into segments at labelled q-points: a labelled pair of
 * consecutive q-points (a joint or a break) ends one segment and starts the
 * next, and a single labelled q-point inside the path is written twice, as
 * end and start of two segments, as phonopy does. Unlabelled segment ends
 * get an empty label when other ends are labelled. `distance` follows
 * phonopy's definition (crystallographic Å⁻¹, constant across segment
 * boundaries).
 *
 * Site masses come from `properties.mass` (as set by
 * {@link fromPhonopyBandYaml}), then the species, then the periodic table.
 *
 * @param opts.eigenvectors - Write eigenvectors; defaults to true unless
 *   they are all zero (e.g. read from a file without them).
 */
export function toPhonopyBandYaml(
  bands: PhononBands,
  opts: { eigenvectors?: boolean } = {},
): string {
  const { structure, nmodes } = bands;
  const nsites = structure.sites.length;
  const withEigenvectors = opts.eigenvectors ?? bands.eigenvectors.some((x) => x !== 0);
  const segments = pathSegments(bands);
  const labels = new Map(bands.labels.map((l) => [l.index, l.label]));
  const anyLabels = segments.some(([a, b]) => labels.has(a) || labels.has(b));
  const distances = qpointDistances(bands);

  const out: string[] = [];
  out.push(`nqpoint: ${String(segments.reduce((n, [a, b]) => n + b - a + 1, 0)).padEnd(7)}`);
  out.push(`npath: ${String(segments.length).padEnd(7)}`);
  out.push("segment_nqpoint:");
  for (const [a, b] of segments) out.push(`- ${b - a + 1}`);
  if (anyLabels) {
    out.push("labels:");
    for (const [a, b] of segments) {
      out.push(`- [ ${quote(labels.get(a) ?? "")}, ${quote(labels.get(b) ?? "")} ]`);
    }
  }
  out.push("reciprocal_lattice:");
  const rec = reciprocalLatticeCrystallographic(structure.lattice).basis.data;
  ["a*", "b*", "c*"].forEach((axis, k) => {
    out.push(`- [ ${f(rec[3 * k], 12, 8)}, ${f(rec[3 * k + 1], 12, 8)}, ${f(rec[3 * k + 2], 12, 8)} ] # ${axis}`);
  });
  out.push(`natom: ${String(nsites).padEnd(7)}`);
  out.push("lattice:");
  const a = structure.lattice.basis.data;
  ["a", "b", "c"].forEach((axis, k) => {
    out.push(`- [ ${f(a[3 * k], 21, 15)}, ${f(a[3 * k + 1], 21, 15)}, ${f(a[3 * k + 2], 21, 15)} ] # ${axis}`);
  });
  out.push("points:");
  structure.sites.forEach((site, s) => {
    const [x, y, z] = site.frac;
    out.push(`- symbol: ${site.species.symbol} # ${s + 1}`);
    out.push(`  coordinates: [ ${f(x, 18, 15)}, ${f(y, 18, 15)}, ${f(z, 18, 15)} ]`);
    out.push(`  mass: ${siteMass(site).toFixed(6)}`);
  });
  out.push("", "phonon:");

  // each q-point block is joined as it is finished, so at most one block's
  // lines are alive at a time instead of millions for the whole file
  const e = bands.eigenvectors;
  for (const [first, last] of segments) {
    for (let q = first; q <= last; q++) {
      const block: string[] = [];
      const o = 3 * q;
      block.push(`- q-position: [ ${f(bands.qpoints[o], 12, 7)}, ${f(bands.qpoints[o + 1], 12, 7)}, ${f(bands.qpoints[o + 2], 12, 7)} ]`);
      block.push(`  distance: ${f(distances[q], 12, 7)}`);
      block.push("  band:");
      for (let m = 0; m < nmodes; m++) {
        block.push(`  - # ${m + 1}`);
        block.push(`    frequency: ${f(bands.frequencies[q * nmodes + m] / THZ_TO_CM, 15, 10)}`);
        if (!withEigenvectors) continue;
        block.push("    eigenvector:");
        let p = (q * nmodes + m) * nmodes * 2;
        for (let s = 0; s < nsites; s++) {
          block.push(`    - # atom ${s + 1}`);
          for (let k = 0; k < 3; k++, p += 2) {
            block.push(`      - [ ${f(e[p], 17, 14)}, ${f(e[p + 1], 17, 14)} ]`);
          }
        }
      }
      block.push("");
      out.push(block.join("\n"));
    }
  }
  // every q-point block ends with a blank line, as in phonopy
  return out.join("\n") + "\n";
}

/**
 * [first, last] q-point index of each path segment for band.yaml: split at
 * labelled q-points, see {@link toPhonopyBandYaml}.
 */
function pathSegments(bands: PhononBands): [number, number][] {
  const { nqpts } = bands;
  if (nqpts === 0) return [];
  const labelled = new Set(bands.labels.map((l) => l.index));
  const segments: [number, number][] = [];
  let start = 0;
  for (let q = 1; q < nqpts - 1; q++) {
    if (!labelled.has(q)) continue;
    if (labelled.has(q + 1)) {
      // joint or break: q ends this segment, q + 1 starts the next
      segments.push([start, q]);
      start = q + 1;
      q++;
    } else if (q > start) {
      // a corner: shared by both segments
      segments.push([start, q]);
      start = q;
    }
  }
  segments.push([start, nqpts - 1]);
  return segments;
}

function sameQPoint(qpoints: Float64Array, a: number, b: number): boolean {
  return [0, 1, 2].every((j) => Math.abs(qpoints[3 * a + j] - qpoints[3 * b + j]) < 1e-6);
}

/** printf-style %w.df, keeping the sign of -0 as phonopy (numpy) does. */
function f(x: number, width: number, decimals: number): string {
  return ((Object.is(x, -0) ? "-" : "") + x.toFixed(decimals)).padStart(width);
}

function quote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function unquoteAll(s: string): string[] {
  return [...s.matchAll(QUOTED)].map((m) =>
    m[1] !== undefined ? m[1].replace(/''/g, "'") : m[2].replace(/\\(.)/g, "$1"),
  );
}

function countOccurrences(text: string, needle: string): number {
  let n = 0;
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length)) n++;
  return n;
}

function stripComment(s: string): string {
  const hash = s.indexOf("#");
  return (hash >= 0 ? s.slice(0, hash) : s).trim();
}

function parseVector(line: string, n: number, i: number): number[] {
  const a = line.indexOf("[");
  const b = line.indexOf("]", a);
  const parts = a >= 0 && b > a ? line.slice(a + 1, b).split(",") : [];
  if (parts.length !== n) {
    throw new Error(`Line ${i + 1}: expected [${n} numbers], got '${line.trim()}'`);
  }
  return parts.map((p) => parseNumber(p, i));
}

function parseNumber(s: string, line: number): number {
  const t = s.trim();
  const x = t === "" ? NaN : Number(t);
  if (!Number.isFinite(x)) {
    throw new Error(`Line ${line + 1}: cannot parse number '${t}'`);
  }
  return x;
}

function parseInteger(s: string, line: number): number {
  const x = parseNumber(s, line);
  if (!Number.isInteger(x) || x < 0) {
    throw new Error(`Line ${line + 1}: expected a non-negative integer, got '${s}'`);
  }
  return x;
}
