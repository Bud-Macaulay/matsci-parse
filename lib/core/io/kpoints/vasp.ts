import type {
  GridShape,
  Vec3,
  KGrid,
  KPath,
  KPoint,
  KPointSet,
} from "../../kpoints/kpoints";
import { LineReader } from "../helpers";

/** Comment line written for automatic-mesh output. */
const GRID_COMMENT = "Automatic mesh";
/** Comment line written for explicit-list output. */
const LIST_COMMENT = "K-points list";

/**
 * Parse a VASP KPOINTS file.
 *
 * Automatic subdivision meshes (line 2 is "0") become a {@link KGrid}; explicit
 * k-point lists (line 2 is a positive count) become a {@link KPointSet}; line
 * modes (line 2 is a count with a "Line-mode" scheme, or a negative count)
 * become a {@link KPath}. The deprecated fully-automatic mode errors out.
 */
export function fromKPOINTS(text: string): KGrid | KPath | KPointSet {
  const r = new LineReader(text);

  // The first line is a free-form comment. Skip any leading blank lines,
  // though there should not be any.
  let line = r.next();
  while (line !== null && line.trim() === "") {
    line = r.next();
  }
  if (line === null) {
    throw new Error("KPOINTS file is too short");
  }

  const mode = r.nextTrimmed();
  const modeNumber = Number(mode);
  if (mode === "0") {
    return parseAutomaticMesh(r);
  }
  if (Number.isInteger(modeNumber)) {
    const scheme = r.nextTrimmed();
    // A negative count is the legacy line-mode marker; a "Line-mode" scheme
    // line marks the current one.
    if (scheme.toLowerCase().startsWith("l") || modeNumber < 0) {
      return parseLineMode(r, scheme, modeNumber < 0);
    }
    return parseExplicitList(r, scheme, modeNumber);
  }
  throw new Error(`Unsupported KPOINTS mode '${mode}'`);
}

/** Parse an automatic subdivision (mesh) card. */
function parseAutomaticMesh(r: LineReader): KGrid {
  const scheme = r.nextTrimmed();
  const first = scheme.toLowerCase();
  if (first.startsWith("a")) {
    throw new Error("KPOINTS fully-automatic mode is not yet supported");
  }
  const monkhorstPack = first.startsWith("m");

  const mesh = parseVec3(r.nextTrimmed(), "mesh");

  // The shift line is optional and defaults to no shift.
  const shiftLine = r.next();
  const shift: Vec3 =
    shiftLine === null || shiftLine.trim() === ""
      ? [0, 0, 0]
      : parseVec3(shiftLine.trim(), "shift");

  return {
    mesh,
    origin: monkhorstPack ? monkhorstOrigin(mesh, shift) : shift,
  };
}

/** Parse an explicit k-point list. */
function parseExplicitList(
  r: LineReader,
  scheme: string,
  count: number,
): KPointSet {
  const coordinateSystem = parseCoordinateSystem(scheme);

  const points: KPoint[] = [];
  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    const { coordinate, weight } = parsePointLine(r.nextTrimmed());
    points.push({ coordinate });
    weights.push(weight);
  }

  return { points, weights, coordinateSystem };
}

/**
 * Parse a line-mode band path. `legacyScheme` marks files where the line after
 * the (negative) count is already the coordinate system line.
 *
 * Coordinates are stored in the canonical fractional reciprocal form; Cartesian
 * input cannot be converted without the lattice and is rejected.
 */
function parseLineMode(
  r: LineReader,
  scheme: string,
  legacyScheme: boolean,
): KPath {
  const coordinateSystem = parseCoordinateSystem(
    legacyScheme ? scheme : r.nextTrimmed(),
  );
  if (coordinateSystem === "cartesian") {
    throw new Error(
      "KPOINTS Cartesian line-mode is not yet supported",
    );
  }

  // Group the remaining lines into blank-line-separated blocks, each block
  // holding the points of one or more segments (two lines per segment).
  const blocks: string[][] = [];
  let current: string[] = [];
  let line: string | null;
  while ((line = r.next()) !== null) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(trimmed);
    }
  }
  if (current.length > 0) {
    blocks.push(current);
  }

  const points: Record<string, Vec3> = {};
  const segments: [string, string][] = [];
  let autoName = 0;

  for (const block of blocks) {
    if (block.length % 2 !== 0) {
      throw new Error("KPOINTS line-mode segments must come in pairs of lines");
    }
    for (let i = 0; i < block.length; i += 2) {
      const start = registerPathPoint(points, parsePathPoint(block[i]), ++autoName);
      const stop = registerPathPoint(points, parsePathPoint(block[i + 1]), ++autoName);
      segments.push([start, stop]);
    }
  }

  return { points, segments };
}

/** Parse a line-mode point row: x y z [label]; labels may follow "!". */
function parsePathPoint(line: string): {
  coordinate: Vec3;
  label?: string;
} {
  const bang = line.indexOf("!");
  const content = bang === -1 ? line : line.slice(0, bang);
  const comment = bang === -1 ? "" : line.slice(bang + 1).trim();

  const tokens = content.trim().split(/\s+/);
  if (tokens.length < 3 || tokens.length > 4) {
    throw new Error(`Invalid KPOINTS point: '${line}'`);
  }
  const values = tokens.slice(0, 3).map(Number);
  if (values.some((v) => Number.isNaN(v))) {
    throw new Error(`Invalid KPOINTS point: '${line}'`);
  }
  return {
    coordinate: [values[0], values[1], values[2]],
    label: comment || tokens[3],
  };
}

/** Register a path point by name, auto-naming unlabeled points. */
function registerPathPoint(
  points: Record<string, Vec3>,
  point: { coordinate: Vec3; label?: string },
  autoName: number,
): string {
  const name = point.label ?? `k${autoName}`;
  const existing = points[name];
  if (existing !== undefined && !vecApproxEqual(existing, point.coordinate)) {
    throw new Error(
      `KPOINTS label '${name}' is used for two different k-points`,
    );
  }
  points[name] = point.coordinate;
  return name;
}

function vecApproxEqual(a: Vec3, b: Vec3): boolean {
  return a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
}

/** Parse a coordinate system name (full or abbreviated, any case). */
function parseCoordinateSystem(line: string): KPointSet["coordinateSystem"] {
  const cs = line.toLowerCase();
  if (cs === "reciprocal" || cs === "frac" || cs === "r") return "reciprocal";
  if (cs === "cartesian" || cs === "cart" || cs === "c") return "cartesian";
  throw new Error(`Unknown KPOINTS coordinate system '${line}'`);
}

/**
 * Parse a single k-point row: x y z [weight] [label]. The weight defaults to 1
 * and a trailing label (as produced by some generators) is ignored.
 */
function parsePointLine(line: string): { coordinate: Vec3; weight: number } {
  const tokens = line.split(/\s+/);
  if (tokens.length < 3) {
    throw new Error(`Invalid KPOINTS point: '${line}'`);
  }
  const values = tokens.map(Number);
  const required = tokens.length >= 4 ? values.slice(0, 4) : values.slice(0, 3);
  if (required.some((v) => Number.isNaN(v))) {
    throw new Error(`Invalid KPOINTS point: '${line}'`);
  }
  return {
    coordinate: [values[0], values[1], values[2]],
    weight: tokens.length >= 4 ? values[3] : 1,
  };
}

/** Parse a line of three numbers, e.g. the mesh or shift row. */
function parseVec3(line: string, what: string): Vec3 {
  const values = line.split(/\s+/).map(Number);
  if (values.length !== 3 || values.some((v) => Number.isNaN(v))) {
    throw new Error(`Invalid KPOINTS ${what}: '${line}'`);
  }
  return [values[0], values[1], values[2]];
}

/**
 * Offset applied to each axis so a Monkhorst-Pack grid is symmetric about the
 * origin. KGrid index [i, j, k] sits at origin + [i/nx, j/ny, k/nz], while MP
 * points are at (2i - n - 1) / 2n, so the origin is (1 - n) / 2n per axis.
 */
function monkhorstOrigin(mesh: GridShape, shift: Vec3): Vec3 {
  const offset = (n: number, s: number) => (1 - n) / (2 * n) + s;
  return [
    offset(mesh[0], shift[0]),
    offset(mesh[1], shift[1]),
    offset(mesh[2], shift[2]),
  ];
}

/**
 * Serialize k-point data back to a VASP KPOINTS file.
 *
 * Grids are written as automatic subdivision meshes. K-point sets are
 * canonicalized to a mesh when their points form a regular grid with uniform
 * weights (only in reciprocal coordinates); otherwise they are written as an
 * explicit list. Paths are written in reciprocal line mode, interpolating
 * `pointsPerLine` k-points per segment (default 40 when omitted).
 */
export function toKPOINTS(
  data: KGrid | KPath | KPointSet,
  pointsPerLine?: number,
): string {
  if ("mesh" in data) {
    return serializeGrid(data);
  }
  if ("segments" in data) {
    return serializePath(data, pointsPerLine);
  }
  return serializePointSet(data);
}

/**
 * Serialize a mesh, inferring the scheme from the origin: a grid whose origin
 * is the canonical Monkhorst-Pack offset (1 - n) / 2n for its mesh is written
 * as a Monkhorst-Pack file, anything else as a Gamma-centered file with the
 * origin as the shift. Either way the generated k-point mesh is identical.
 */
function serializeGrid({ mesh, origin }: KGrid): string {
  const monkhorst = origin.every(
    (o, i) => Math.abs(o - (1 - mesh[i]) / (2 * mesh[i])) < 1e-12,
  );
  const scheme = monkhorst ? "Monkhorst-Pack" : "Gamma";
  const shift = monkhorst ? [0, 0, 0] : origin;

  return [
    GRID_COMMENT,
    "0",
    scheme,
    mesh.join(" "),
    shift.join(" "),
  ].join("\n");
}

/** Serialize an explicit k-point list, canonicalizing to a mesh if possible. */
function serializePointSet(data: KPointSet): string {
  const grid = detectGrid(data);
  if (grid) {
    return serializeGrid(grid);
  }

  const coordinateSystem =
    data.coordinateSystem === "cartesian" ? "Cartesian" : "Reciprocal";
  const rows = data.points.map(
    (p, i) => `${p.coordinate.join(" ")} ${data.weights?.[i] ?? 1}`,
  );

  return [
    LIST_COMMENT,
    String(data.points.length),
    coordinateSystem,
    ...rows,
  ].join("\n");
}

/**
 * Serialize a band path in reciprocal line mode. The number of points per line
 * is not part of {@link KPath} and is written with this default.
 */
const DEFAULT_POINTS_PER_LINE = 40;

function serializePath(
  { points, segments }: KPath,
  pointsPerLine?: number,
): string {
  const density =
    pointsPerLine === undefined
      ? DEFAULT_POINTS_PER_LINE
      : Math.max(1, Math.round(pointsPerLine));

  const rows: string[] = [];
  for (const [start, stop] of segments) {
    rows.push(`${points[start].join(" ")} ${start}`);
    rows.push(`${points[stop].join(" ")} ${stop}`);
    rows.push("");
  }
  rows.pop();

  return [
    "Band path",
    String(density),
    "Line-mode",
    "Reciprocal",
    ...rows,
  ].join("\n");
}

/**
 * Detect whether a reciprocal-coordinate point set is a regular grid.
 * Returns the grid, or null if the set is not a uniform mesh (non-uniform
 * weights, Cartesian coordinates, or irregular point spacing).
 */
function detectGrid(data: KPointSet): KGrid | null {
  if (data.coordinateSystem === "cartesian") return null;

  const weights = data.weights;
  if (weights && !weights.every((w) => Math.abs(w - weights[0]) < 1e-12)) {
    return null;
  }

  const axes: number[][] = [[], [], []];
  for (const { coordinate } of data.points) {
    for (let i = 0; i < 3; i++) {
      if (!axes[i].some((u) => Math.abs(u - coordinate[i]) < 1e-12)) {
        axes[i].push(coordinate[i]);
      }
    }
  }
  for (const axis of axes) {
    axis.sort((a, b) => a - b);
  }

  const mesh: GridShape = [axes[0].length, axes[1].length, axes[2].length];
  if (mesh[0] * mesh[1] * mesh[2] !== data.points.length) return null;

  // Each axis must be evenly spaced with step 1/n from the first value.
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < mesh[i]; j++) {
      if (Math.abs(axes[i][j] - (axes[i][0] + j / mesh[i])) > 1e-9) {
        return null;
      }
    }
  }

  return { mesh, origin: [axes[0][0], axes[1][0], axes[2][0]] };
}
