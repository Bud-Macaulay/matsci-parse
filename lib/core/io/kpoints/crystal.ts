import type { KPath, KPoints, Vec3 } from "../../kpoints/kpoints";

// ──────────────────────────────────────────────────────────────────────
//  CRYSTAL D3 BAND format: properties keyword BAND of the CRYSTAL manual
//  (CRYSTAL14 p. 198, CRYSTAL17: the same records)
//  https://www.crystal.unito.it/Manuals/crystal17.pdf
//
//    BAND
//    TITLE
//    NLINE ISS NSUB INZB IFNB IPLO LPR66
//    I1 I2 I3 J1 J2 J3        (NLINE records, if ISS > 0)
//
//    NLINE  number of lines (segments) in reciprocal space (max 20)
//    ISS    shrinking factor in terms of which the segment ends are expressed
//    NSUB   total number of k points along the path
//    INZB   first band;  IFNB  last band
//    IPLO   1: formatted output for plotting (fort.25)
//    LPR66  != 0: printing of eigenvalues
//
//  I1 I2 I3 (J1 J2 J3) are INTEGERS: the start (end) of the line is
//  I1/ISS b1 + I2/ISS b2 + I3/ISS b3, with b1, b2, b3 the reciprocal lattice
//  vectors. With ISS = 0 the lines are CRYSTAL's own point labels instead
//  (e.g. "G X"), not read here: their coordinates depend on the Bravais
//  lattice. A `!` comment after a line (e.g. "GAMMA -> X") names its ends.
// ──────────────────────────────────────────────────────────────────────

const BAND_HEADER = /^BAND\s*$/i;

/** The most lines (segments) CRYSTAL's BAND reads (CRYSTAL14, 17 and 23
 * manuals: "max 20"). Longer paths are still written, with a warning. */
export const CRYSTAL_MAX_BAND_LINES = 20;

/** Largest shrinking factor tried for exact segment ends. */
const MAX_EXACT_SHRINK = 1000;
/** Shrinking factor when a segment end is not a fraction with a denominator
 * up to MAX_EXACT_SHRINK (e.g. seekpath points that depend on irrational
 * cell ratios): the ends are then rounded to multiples of 1e-6, and the
 * integers stay well within CRYSTAL's 32-bit range. */
const FALLBACK_SHRINK = 1_000_000;
/** INZB and IFNB, the first and last band to compute: for the user to set. */
const BAND_PLACEHOLDERS = "<first_band> <last_band>";

/** A coordinate within this of a multiple of 1/ISS is that multiple. */
const EXACT_TOL = 1e-9;

/** The smallest shrinking factor that writes every coordinate exactly as an
 * integer in units of 1/ISS, or FALLBACK_SHRINK. */
function shrinkingFactor(values: number[]): number {
  for (let n = 1; n <= MAX_EXACT_SHRINK; n++) {
    if (values.every((x) => Math.abs(x * n - Math.round(x * n)) <= EXACT_TOL * n)) {
      return n;
    }
  }
  return FALLBACK_SHRINK;
}

/** Default number of k-points interpolated per band-path segment. */
const DEFAULT_POINTS_PER_SEGMENT = 40;

function stripComment(line: string): string {
  let cut = line.length;
  const bang = line.indexOf("!");
  const hash = line.indexOf("#");
  if (bang !== -1) cut = Math.min(cut, bang);
  if (hash !== -1) cut = Math.min(cut, hash);
  return line.slice(0, cut).trim();
}

function extractComment(line: string): string {
  const bang = line.indexOf("!");
  const content = bang === -1 ? line : line.slice(0, bang);
  const explicit = bang === -1 ? "" : line.slice(bang + 1).trim();
  if (explicit !== "") return explicit;

  // No `!` marker: any tokens after the first six (the segment coordinates)
  // are treated as the segment label, e.g. "GAMMA -> C".
  const tokens = content.trim().split(/\s+/).filter((t) => t !== "");
  for (let i = 6; i < tokens.length; i++) {
    if (!NUMERIC_TOKEN.test(tokens[i])) {
      return tokens.slice(i).join(" ");
    }
  }
  return "";
}

const NUMERIC_TOKEN = /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/;

function parseVec6(line: string): [Vec3, Vec3] {
  const stripped = stripComment(line);
  const tokens = stripped.split(/\s+/).filter(Boolean);
  if (tokens.length < 6) {
    throw new Error(`Invalid D3 BAND segment line: '${line}'`);
  }
  const nums = tokens.slice(0, 6).map(Number);
  if (nums.some(Number.isNaN)) {
    throw new Error(`Invalid D3 BAND segment line: '${line}'`);
  }
  return [
    [nums[0], nums[1], nums[2]],
    [nums[3], nums[4], nums[5]],
  ];
}

/** A segment line: the ends as integers in units of 1/shrink, and a comment. */
function formatVec6(start: Vec3, end: Vec3, shrink: number, comment: string): string {
  const cmt = comment ? `   ${comment}` : "";
  // `${-0}` is "0"
  const ints = [...start, ...end].map((x) => `${Math.round(x * shrink)}`);
  return `${ints.join(" ")}${cmt}`;
}

/**
 * Parse a CRYSTAL D3 BAND input file into the canonical k-point representation.
 *
 * Segments are returned as a {@link KPath}, with the segment ends in
 * fractional reciprocal coordinates (the integers of the file divided by the
 * shrinking factor ISS). Files with ISS = 0 (CRYSTAL's own point labels) are
 * rejected.
 *
 * @param text The D3 BAND file content.
 */
export function fromCrystalD3(text: string): KPath {
  // Only trim leading/trailing blank lines: an empty title line is valid
  // and must stay in its slot (line 2).
  const raw = text.split("\n");
  let first = 0;
  let last = raw.length - 1;
  while (first < raw.length && raw[first].trim() === "") first++;
  while (last > first && raw[last].trim() === "") last--;
  const lines = raw.slice(first, last + 1);

  if (lines.length < 3) {
    throw new Error("D3 BAND file is too short");
  }

  if (!BAND_HEADER.test(lines[0].trim())) {
    throw new Error("D3 BAND file must start with 'BAND'");
  }

  // Line 2: title (ignored for canonical representation)
  const _title = lines[1].trim();

  // Line 3: NLINE ISS NSUB INZB IFNB IPLO LPR66 (only the first two are needed)
  const [nks, shrink] = stripComment(lines[2])
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(Number);
  if (!Number.isInteger(nks) || !Number.isInteger(shrink) || shrink < 0) {
    throw new Error("Invalid D3 BAND header line: expected NLINE and ISS");
  }
  if (shrink === 0) {
    throw new Error(
      "D3 BAND with ISS = 0 (CRYSTAL point labels) is not supported: their coordinates depend on the Bravais lattice",
    );
  }

  if (lines.length < 3 + nks) {
    throw new Error(
      `D3 BAND header declares ${nks} segments but only ${lines.length - 3} lines remain`,
    );
  }

  const points: Record<string, Vec3> = {};
  const nameByCoord = new Map<string, string>();
  const segments: [string, string][] = [];
  let autoName = 0;

  const nameFor = (coord: Vec3, preferred?: string): string => {
    const key = coord.join(" ");
    const existing = nameByCoord.get(key);
    if (existing !== undefined) return existing;
    if (preferred !== undefined) {
      const prev = points[preferred];
      if (prev !== undefined && !vecApproxEqual(prev, coord)) {
        throw new Error(
          `D3 BAND: label '${preferred}' used for two different coordinates`,
        );
      }
      nameByCoord.set(key, preferred);
      points[preferred] = coord;
      return preferred;
    }
    const name = `k${++autoName}`;
    nameByCoord.set(key, name);
    points[name] = coord;
    return name;
  };

  for (let i = 3; i < 3 + nks; i++) {
    const line = lines[i];
    const [start, end] = parseVec6(line).map(
      ([x, y, z]): Vec3 => [x / shrink, y / shrink, z / shrink],
    );
    const comment = extractComment(line);

    // Parse comment like "GAMMA -> C" or "C_2 -> Y_2"
    let startName: string | undefined;
    let endName: string | undefined;
    if (comment.includes("->")) {
      const parts = comment.split("->").map((s) => s.trim());
      startName = parts[0] || undefined;
      endName = parts[1] || undefined;
    }

    segments.push([
      nameFor(start, startName),
      nameFor(end, endName),
    ]);
  }

  return { kind: "path", points, segments };
}

function vecApproxEqual(a: Vec3, b: Vec3): boolean {
  return a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
}

/**
 * Serialize canonical k-point data as a CRYSTAL D3 BAND input file.
 *
 * The segment ends are written as integers in units of 1/ISS, with ISS the
 * smallest shrinking factor that writes them exactly (or 10^6, rounding them
 * to 1e-6, for coordinates that are not simple fractions), each line with a
 * `start -> end` comment. The header: the segment count, ISS, the total
 * number of k points (segments × points per segment), placeholders for the
 * first and last band to compute (INZB, IFNB: they depend on the calculation,
 * e.g. 1 and a few bands above the highest occupied one), unit-25 writing on,
 * and no printing options, then a comment naming the values. (CRYSTAL reads
 * the numbers of a record and ignores the rest of its line.)
 *
 * A path of more than {@link CRYSTAL_MAX_BAND_LINES} segments (e.g. seekpath's
 * without time reversal) is written all the same, with a warning, on the
 * console and at the start of the title line (CRYSTAL reads its first 72
 * characters).
 *
 * @param data             The canonical k-point data.  Must be a {@link KPath}.
 * @param title            Optional title line (defaults to empty).
 * @param pointsPerSegment Number of k points interpolated per segment.
 *                         Defaults to the path's own `density` when set,
 *                         otherwise 40.
 */
export function toCrystalD3(
  data: KPoints,
  title = "",
  pointsPerSegment?: number,
): string {
  if (data.kind !== "path") {
    throw new Error("toCrystalD3 only supports KPath data");
  }

  const ends = data.segments.map(([startName, endName]) => {
    const start = data.points[startName];
    const end = data.points[endName];
    if (!start || !end) {
      throw new Error(
        `KPath references unknown point '${startName}' or '${endName}'`,
      );
    }
    return { start, end, comment: `${startName} -> ${endName}` };
  });
  const shrink = shrinkingFactor(ends.flatMap(({ start, end }) => [...start, ...end]));
  const segmentLines = ends.map(({ start, end, comment }) =>
    formatVec6(start, end, shrink, comment),
  );

  const nseg = data.segments.length;
  let titleLine = title;
  if (nseg > CRYSTAL_MAX_BAND_LINES) {
    const warning = `WARNING: ${nseg} lines, CRYSTAL reads at most ${CRYSTAL_MAX_BAND_LINES}`;
    console.warn(`toCrystalD3: ${warning}`);
    titleLine = title ? `${warning}; ${title}` : warning;
  }
  const density =
    pointsPerSegment !== undefined
      ? Math.max(1, Math.round(pointsPerSegment))
      : data.density !== undefined
        ? Math.max(1, Math.round(data.density))
        : DEFAULT_POINTS_PER_SEGMENT;

  // TODO(check): CRYSTAL's exact joint-dedup rule for the total k-point count
  // is unverified.  nseg × points-per-segment matches the MgO tutorial
  // (4 segments → 60 total = 4 × 15) and mirrors the VASP/QE density semantics.
  const totalPoints = nseg * density;
  // NLINE ISS NSUB INZB IFNB IPLO LPR66; the bands are the user's to set
  const header =
    `${nseg} ${shrink} ${totalPoints} ${BAND_PLACEHOLDERS} 1 0` +
    "   ! NLINE ISS NSUB INZB IFNB IPLO LPR66: set INZB, IFNB, the first and last band";

  return ["BAND", titleLine, header, ...segmentLines].join("\n");
}
