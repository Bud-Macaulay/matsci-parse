import type { KPath, KPoints, Vec3 } from "../../kpoints/kpoints";

// ──────────────────────────────────────────────────────────────────────
//  CRYSTAL D3 BAND format
//  https://www.crystal.unito.it/Manuals/crystal17.pdf
//
//  Format (for a band-structure path):
//    BAND
//    <title>
//    <nseg> <nband/npts/nrec/...> <first_band> <last_band>   !<comment>
//    x1 y1 z1 x2 y2 z2   !Segment_name
//    ...
//
//  Each segment line has 6 reciprocal-space coordinates (start, end)
//  followed by an optional `!` comment indicating the segment label.
//  The first header number is the number of segment lines.
// ──────────────────────────────────────────────────────────────────────

const BAND_HEADER = /^BAND\s*$/i;

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

function formatVec6(start: Vec3, end: Vec3, comment: string): string {
  const cmt = comment ? `   ${comment}` : "";
  return `${start.join(" ")} ${end.join(" ")}${cmt}`;
}

/**
 * Parse a CRYSTAL D3 BAND input file into the canonical k-point representation.
 *
 * Segments are returned as a {@link KPath}.  Coordinates are in reciprocal
 * lattice units (2π/a); converting to fractional coordinates requires the
 * lattice.  The returned path stores the raw coordinates.
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

  // Line 3: header — first number is the number of segments
  const headerNums = stripComment(lines[2])
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  if (headerNums.length < 1 || headerNums.some(Number.isNaN)) {
    throw new Error("Invalid D3 BAND header line");
  }
  const nks = headerNums[0];

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
    const [start, end] = parseVec6(line);
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
 * The path segments are written as start/end coordinate pairs with inline
 * segment name comments.  A header line with reasonable defaults is
 * included (1 band, 0th–0th band range).
 *
 * @param data  The canonical k-point data.  Must be a {@link KPath}.
 * @param title Optional title line (defaults to empty).
 */
export function toCrystalD3(data: KPoints, title = ""): string {
  if (data.kind !== "path") {
    throw new Error("toCrystalD3 only supports KPath data");
  }

  const segmentLines: string[] = [];
  for (const [startName, endName] of data.segments) {
    const start = data.points[startName];
    const end = data.points[endName];
    if (!start || !end) {
      throw new Error(
        `KPath references unknown point '${startName}' or '${endName}'`,
      );
    }
    segmentLines.push(formatVec6(start, end, `${startName} -> ${endName}`));
  }

  const nks = data.segments.length;
  // Header: [nsegments, nrec=0, npts=0, first_band=1, last_band=0]
  const header = `${nks} 0 0 1 0`;

  return ["BAND", title, header, ...segmentLines].join("\n");
}
