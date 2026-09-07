import type {
  KGrid,
  KPath,
  KPointSet,
  KPoints,
  Vec3,
} from "../../kpoints/kpoints";
import type { KPointsBands, KPointsCard, KPointsList, Kpt } from "../pw/schema/cards";

const K_POINTS_HEADER = /^K_POINTS(?:\s+\{?\(?(\w+)\)?\}?)?/i;
const NEXT_CARD =
  /^(?:ATOMIC_SPECIES|ATOMIC_POSITIONS|CELL_PARAMETERS|K_POINTS|ADDITIONAL_K_POINTS|OCCUPATIONS|CONSTRAINTS|ATOMIC_VELOCITIES|ATOMIC_FORCES|HUBBARD|SOLVENTS)\b/i;

function stripComment(line: string): string {
  let cut = line.length;
  const bang = line.indexOf("!");
  const hash = line.indexOf("#");
  if (bang !== -1) cut = Math.min(cut, bang);
  if (hash !== -1) cut = Math.min(cut, hash);
  return line.slice(0, cut);
}

function toNumbers(line: string): number[] {
  return stripComment(line)
    .split(/\s+/)
    .filter((t) => t !== "")
    .map(Number);
}

function parseKpt(line: string): Kpt {
  const n = toNumbers(line);
  if (n.length < 4) {
    throw new Error(`Invalid K_POINTS line: ${line}`);
  }
  return { x: n[0], y: n[1], z: n[2], w: n[3] };
}

function parsePointList(rest: string[]): Kpt[] {
  const count = Number.parseInt(rest[0] ?? "", 10);
  if (Number.isNaN(count)) {
    throw new Error("K_POINTS list requires a point count");
  }
  const pointLines = rest.slice(1, 1 + count);
  if (pointLines.length !== count) {
    throw new Error(`Expected ${count} k-points, got ${pointLines.length}`);
  }
  return pointLines.map(parseKpt);
}

/** Extract the K_POINTS card block from a pw.x input. */
function extractKPointsBlock(text: string): string[] {
  const lines = text.split("\n");
  let start = -1;

  for (let i = 0; i < lines.length; i++) {
    if (K_POINTS_HEADER.test(lines[i].trim())) {
      start = i;
      break;
    }
  }

  if (start === -1) {
    throw new Error("K_POINTS card not found");
  }

  const block = [lines[start].trim()];

  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === "" || NEXT_CARD.test(l)) break;
    block.push(l);
  }

  return block;
}

/** Parse the K_POINTS card of a Quantum ESPRESSO pw.x input into typed card data. */
export function fromPWKPoints(text: string): KPointsCard {
  const block = extractKPointsBlock(text);
  const modeMatch = block[0].match(K_POINTS_HEADER);
  const mode = (modeMatch?.[1]?.toLowerCase() ??
    "automatic") as KPointsCard["mode"];
  const rest = block.slice(1);

  switch (mode) {
    case "automatic": {
      const n = toNumbers(rest[0] ?? "");
      if (n.length < 6) {
        throw new Error("K_POINTS automatic requires 6 numbers");
      }
      return {
        mode,
        grid: [n[0], n[1], n[2]],
        shift: [n[3], n[4], n[5]],
      };
    }
    case "gamma":
      return { mode };
    case "crystal":
    case "tpiba":
      return { mode, points: parsePointList(rest) };
    case "crystal_b":
    case "tpiba_b": {
      const nks = Number.parseInt(rest[0] ?? "", 10);
      if (Number.isNaN(nks)) {
        throw new Error("K_POINTS band path requires nks");
      }
      const pointLines = rest.slice(1, 1 + nks);
      if (pointLines.length !== nks) {
        throw new Error(
          `Expected ${nks} k-points, got ${pointLines.length}`,
        );
      }
      return { mode, nks, points: pointLines.map(parseKpt) };
    }
    case "crystal_c":
    case "tpiba_c":
      return { mode, points: parsePointList(rest) };
    default:
      throw new Error(`Unsupported K_POINTS mode '${mode}'`);
  }
}

function serializeKpt(k: Kpt): string {
  return `${k.x} ${k.y} ${k.z} ${k.w}`;
}

function serializeList(card: {
  mode: "crystal" | "tpiba" | "crystal_c" | "tpiba_c";
  points: Kpt[];
}): string {
  return [
    `K_POINTS ${card.mode}`,
    String(card.points.length),
    ...card.points.map(serializeKpt),
  ].join("\n");
}

/** Serialize K_POINTS card data back to a Quantum ESPRESSO pw.x card. */
export function toPWKPoints(card: KPointsCard): string {
  switch (card.mode) {
    case "gamma":
      return "K_POINTS gamma";
    case "automatic":
      return `K_POINTS automatic\n${card.grid.join(" ")} ${card.shift.join(" ")}`;
    case "crystal":
    case "tpiba":
      return serializeList(card);
    case "crystal_b":
    case "tpiba_b":
      return [
        `K_POINTS ${card.mode}`,
        String(card.nks),
        ...card.points.map(serializeKpt),
      ].join("\n");
    case "crystal_c":
    case "tpiba_c":
      return serializeList(card);
  }
}

// ──────────────────────────────────────────────────────────────────────
//  Canonical k-point conversions
// ──────────────────────────────────────────────────────────────────────

/** Default number of k-points interpolated per band-path segment. */
const DEFAULT_POINTS_PER_SEGMENT = 40;

function pointListToKPointSet(
  mode: "crystal" | "tpiba" | "crystal_c" | "tpiba_c",
  points: readonly Kpt[],
): KPointSet {
  const reciprocal =
    mode === "crystal" || mode === "crystal_c" ? "reciprocal" : "cartesian";
  return {
    kind: "points",
    points: points.map((k) => ({ coordinate: [k.x, k.y, k.z] as const })),
    weights: points.map((k) => k.w),
    coordinateSystem: reciprocal,
  };
}

function pathFromBandPoints(points: readonly Kpt[]): KPath {
  if (points.length < 2) {
    throw new Error("K_POINTS band path requires at least two points");
  }
  const names = new Map<string, string>();
  const named: Record<string, Vec3> = {};
  const nameFor = (k: Kpt): string => {
    const key = [k.x, k.y, k.z].join(" ");
    let name = names.get(key);
    if (name === undefined) {
      name = `k${names.size + 1}`;
      names.set(key, name);
      named[name] = [k.x, k.y, k.z];
    }
    return name;
  };
  const segments: [string, string][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push([nameFor(points[i]), nameFor(points[i + 1])]);
  }

  // Extract density: the weight of each vertex (except the last) is the
  // number of intermediate k-points on the segment to the next vertex.
  // If all segment weights are equal, set KPath.density.
  const segmentWeights = points.slice(0, -1).map((k) => k.w);
  const density =
    segmentWeights.length > 0 &&
    segmentWeights.every((w) => w === segmentWeights[0])
      ? segmentWeights[0]
      : undefined;

  return { kind: "path", points: named, segments, density };
}

/**
 * Read the K_POINTS card of a Quantum ESPRESSO pw.x input and convert it to
 * the canonical k-point representation.
 *
 * The pw.x card may appear on its own or embedded in a full pw.in file.
 *
 * - automatic grids map to {@link KGrid} (mesh + origin, origin being the shift)
 * - crystal / crystal_c and tpiba / tpiba_c lists map to {@link KPointSet}
 * - crystal_b band paths map to {@link KPath} (tpiba_b needs a lattice and
 *   is not supported)
 */
export function kpointsFromPW(text: string): KPoints {
  const card = fromPWKPoints(text);

  switch (card.mode) {
    case "automatic":
      return {
        kind: "grid",
        mesh: card.grid,
        origin: card.shift,
        scheme: "gamma-centered",
      };
    case "gamma":
      return {
        kind: "grid",
        mesh: [1, 1, 1],
        origin: [0, 0, 0],
        scheme: "gamma-centered",
      };
    case "crystal":
    case "tpiba":
    case "crystal_c":
    case "tpiba_c":
      return pointListToKPointSet(card.mode, card.points);
    case "crystal_b":
      return pathFromBandPoints(card.points);
    case "tpiba_b":
      throw new Error(
        "tpiba_b band paths are expressed in 2*pi/alat units; converting them requires a lattice",
      );
  }
}

function pathToBandCard(
  path: KPath,
  pointsPerSegment: number,
): KPointsBands {
  const vertices: Kpt[] = [];
  // Build the vertex list in segment order (shared endpoints collapse naturally)
  for (const [start, stop] of path.segments) {
    const s = path.points[start];
    if (!s) {
      throw new Error(`KPath references unknown point '${start}'`);
    }
    vertices.push({ x: s[0], y: s[1], z: s[2], w: pointsPerSegment });
  }
  const last = path.segments[path.segments.length - 1];
  if (last) {
    const end = path.points[last[1]];
    if (!end) {
      throw new Error(`KPath references unknown point '${last[1]}'`);
    }
    // Last vertex weight is ignored by pw.x; write 1 by convention.
    vertices.push({ x: end[0], y: end[1], z: end[2], w: 1 });
  }
  return { mode: "crystal_b", nks: vertices.length, points: vertices };
}

function kPointSetToListCard(set: KPointSet): KPointsList {
  const cartesian = set.coordinateSystem === "cartesian";
  return {
    mode: cartesian ? "tpiba" : "crystal",
    points: set.points.map((p, i) => ({
      x: p.coordinate[0],
      y: p.coordinate[1],
      z: p.coordinate[2],
      w: set.weights?.[i] ?? 1,
    })),
  };
}

/**
 * Serialize canonical k-point data as a K_POINTS card block, ready to be
 * embedded in a Quantum ESPRESSO pw.x input file.
 *
 * - grids are written in automatic (Monkhorst-Pack) mode
 * - k-point sets are written as crystal (reciprocal) or tpiba (2*pi/alat)
 *   lists, depending on their coordinate system
 * - paths are written as crystal_b band paths; `pointsPerSegment` (default
 *   40) sets the number of k-points interpolated along each segment.
 *   When `pointsPerSegment` is omitted, the path's own `density` is used
 *   if set, otherwise the default.
 *   High-symmetry point names are written as inline comments.
 */
export function kpointsToPW(
  data: KPoints,
  pointsPerSegment?: number,
): string {
  switch (data.kind) {
    case "grid":
      return toPWKPoints({
        mode: "automatic",
        grid: [...data.mesh],
        shift: [...data.origin],
      });
    case "path": {
      const density =
        pointsPerSegment !== undefined
          ? Math.max(1, Math.round(pointsPerSegment))
          : data.density !== undefined
            ? Math.max(1, Math.round(data.density))
            : DEFAULT_POINTS_PER_SEGMENT;
      return pathWithComments(data, density);
    }
    case "points":
      return toPWKPoints(kPointSetToListCard(data));
  }
}

/**
 * Serialize a KPath as a crystal_b card with high-symmetry point name comments.
 */
function pathWithComments(path: KPath, density: number): string {
  // Build the vertex list in segment order (shared endpoints collapse naturally)
  const vertices: { x: number; y: number; z: number; label: string; w: number }[] = [];
  const seen = new Set<string>();
  for (let si = 0; si < path.segments.length; si++) {
    const [start, stop] = path.segments[si];
    const s = path.points[start];
    if (!s) {
      throw new Error(`KPath references unknown point '${start}'`);
    }
    const sKey = start;
    if (!seen.has(sKey)) {
      seen.add(sKey);
      vertices.push({ x: s[0], y: s[1], z: s[2], label: start, w: density });
    }
  }
  const last = path.segments[path.segments.length - 1];
  if (last) {
    const end = path.points[last[1]];
    if (!end) {
      throw new Error(`KPath references unknown point '${last[1]}'`);
    }
    // Last vertex weight is ignored by pw.x; write 1 by convention.
    vertices.push({ x: end[0], y: end[1], z: end[2], label: last[1], w: 1 });
  }

  const lines = [`K_POINTS crystal_b`, String(vertices.length)];
  for (const v of vertices) {
    lines.push(`${v.x} ${v.y} ${v.z} ${v.w} ! ${v.label}`);
  }
  return lines.join("\n");
}
