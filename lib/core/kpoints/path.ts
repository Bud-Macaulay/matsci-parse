import type { KPath, Vec3 } from "./kpoints";
import {
  createSampledPath,
  kpointCoord,
  type KPointLabel,
  type SampledKPoints,
  type SampledPath,
} from "./sampled";
import type { Lattice } from "../lattice/lattice";
import { reciprocalLatticeCrystallographic } from "../lattice/reciprocalLatticeCrystallographic";
import { createMatrix } from "../matrix/matrix";
import { mul } from "../matrix/operations/mul";

/** Fractional distance below which two path points coincide. */
const SAME_POINT = 1e-6;

/**
 * A sampled path from its coordinates and labels: one segment through
 * every point, split at the labels as {@link labelPath} does.
 */
export function samplePath(
  coords: Float64Array | ArrayLike<number>,
  labels: Iterable<KPointLabel> = [],
): SampledPath {
  const nkpts = Math.floor(coords.length / 3);
  const segments = nkpts > 0 ? [{ start: 0, end: nkpts - 1 }] : [];
  return labelPath(createSampledPath(coords, segments), labels);
}

/**
 * Replace the labels of a path. The existing segment boundaries are kept,
 * and labels inside a segment split it:
 *
 * - a labelled point becomes a corner, shared by the two pieces;
 * - two labelled points in a row end one piece and start the next, which
 *   is a break when they differ in position (e.g. "C" then "C_2").
 *
 * Boundaries left without a label are unnamed.
 */
export function labelPath(path: SampledPath, labels: Iterable<KPointLabel>): SampledPath {
  const named = new Map<number, string>();
  for (const { index, label } of labels) {
    if (!Number.isInteger(index) || index < 0 || index >= path.nkpts) {
      throw new Error(`Label index ${index} out of range [0, ${path.nkpts})`);
    }
    named.set(index, label);
  }

  const pieces: [number, number][] = [];
  for (const { start, end } of path.segments) {
    let from = start;
    for (let q = start; q < end; q++) {
      if (!named.has(q)) continue;
      if (named.has(q + 1) && (q > start || q + 1 < end)) {
        pieces.push([from, q]);
        from = q + 1;
        q++;
      } else if (q > start) {
        pieces.push([from, q]);
        from = q;
      }
    }
    pieces.push([from, end]);
  }
  // a single point shared with a neighbouring piece adds nothing
  const kept = pieces.filter(
    ([a, b], i) => a !== b || !(pieces[i - 1]?.[1] === a || pieces[i + 1]?.[0] === a),
  );

  return createSampledPath(
    path.coords,
    kept.map(([start, end]) => ({ start, end, from: named.get(start), to: named.get(end) })),
  );
}

/** The labelled points of a path (its named segment ends), sorted by index. */
export function pathLabels(path: SampledPath): KPointLabel[] {
  const named = new Map<number, string>();
  for (const { start, end, from, to } of path.segments) {
    if (from !== undefined && !named.has(start)) named.set(start, from);
    if (to !== undefined && !named.has(end)) named.set(end, to);
  }
  return [...named].sort(([a], [b]) => a - b).map(([index, label]) => ({ index, label }));
}

/** Indices i where the path jumps from point i to i + 1. */
export function pathBreaks(path: SampledPath): number[] {
  const breaks: number[] = [];
  const { segments, coords } = path;
  for (let i = 1; i < segments.length; i++) {
    const end = segments[i - 1].end;
    if (segments[i].start === end + 1 && !samePoint(coords, end, end + 1)) breaks.push(end);
  }
  return breaks;
}

/**
 * Collapse path discontinuities in a label list: two consecutive points
 * with different labels ("C" at 35, "C_2" at 36) become one tick "C|C_2" at
 * the first index, and that index is reported as a break. Consecutive
 * points with the same label keep a single entry.
 */
export function mergeLabels(labels: readonly KPointLabel[]): {
  labels: KPointLabel[];
  breaks: number[];
} {
  const merged: KPointLabel[] = [];
  const breaks: number[] = [];
  for (let i = 0; i < labels.length; i++) {
    const cur = labels[i];
    const next = labels[i + 1];
    if (next && next.index === cur.index + 1) {
      if (next.label !== cur.label) {
        merged.push({ index: cur.index, label: `${cur.label}|${next.label}` });
        breaks.push(cur.index);
      } else {
        merged.push(cur);
      }
      i++;
    } else {
      merged.push(cur);
    }
  }
  return { labels: merged, breaks };
}

/**
 * The path as a {@link KPath} specification: its named segment ends.
 * Throws if a segment end is unnamed, or one name labels two different
 * points (a KPath names each point once).
 */
export function toKPath(path: SampledPath): KPath {
  const points: Record<string, Vec3> = {};
  const name = (index: number, label: string | undefined): string => {
    if (label === undefined) throw new Error(`k-point ${index} ends a path segment but has no label`);
    const coord = kpointCoord(path, index);
    const known = points[label];
    if (known && known.some((x, j) => Math.abs(x - coord[j]) > SAME_POINT)) {
      throw new Error(`Label '${label}' names two different k-points`);
    }
    points[label] = coord;
    return label;
  };
  const segments = path.segments.map(({ start, end, from, to }) => [name(start, from), name(end, to)] as const);
  return { kind: "path", points, segments };
}

/** Cartesian coordinates (Å⁻¹, crystallographic: no 2π), [nkpts × 3]. */
export function cartesianKPoints(s: SampledKPoints, lattice: Lattice): Float64Array {
  const b = reciprocalLatticeCrystallographic(lattice).basis;
  return mul(createMatrix(s.nkpts, 3, s.coords), b).data;
}

/**
 * Cumulative path length at each point (Å⁻¹, crystallographic: no 2π),
 * the x-axis of a band structure plot. Across a break the distance does
 * not advance, so the two sides of the jump share an x position.
 */
export function pathDistances(path: SampledPath, lattice: Lattice): Float64Array {
  const cart = cartesianKPoints(path, lattice);
  const breaks = new Set(pathBreaks(path));
  const out = new Float64Array(path.nkpts);
  for (let q = 1; q < path.nkpts; q++) {
    const step = breaks.has(q - 1)
      ? 0
      : Math.hypot(
          cart[3 * q] - cart[3 * q - 3],
          cart[3 * q + 1] - cart[3 * q - 2],
          cart[3 * q + 2] - cart[3 * q - 1],
        );
    out[q] = out[q - 1] + step;
  }
  return out;
}

function samePoint(coords: Float64Array, a: number, b: number): boolean {
  return [0, 1, 2].every((j) => Math.abs(coords[3 * a + j] - coords[3 * b + j]) < SAME_POINT);
}
