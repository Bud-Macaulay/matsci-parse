import type { KGrid } from "./kpoints";

/*
 * Sampled k-points: the points a calculation actually used, as opposed to
 * the specifications in ./kpoints.ts. A KPath names its corners and a
 * density; a code's output lists every point it sampled, possibly unevenly
 * spaced, with path corners written once or twice. Results on k- or
 * q-points (phonon modes, electronic bands) carry one of these.
 *
 * Coordinates are fractional reciprocal, flat row-major [nkpts × 3].
 */

/** A labelled k-point, e.g. `{ index: 0, label: "Γ" }`. */
export interface KPointLabel {
  readonly index: number;
  readonly label: string;
}

/**
 * One segment of a sampled path: points `start`..`end` (inclusive), going
 * from the point named `from` to the point named `to` (either may be
 * unnamed).
 */
export interface PathSegment {
  readonly start: number;
  readonly end: number;
  readonly from?: string;
  readonly to?: string;
}

interface Sampled {
  readonly nkpts: number;
  /** [nkpts × 3]: fractional reciprocal coordinates. */
  readonly coords: Float64Array;
}

/**
 * Points along a path, split into segments that cover every point in
 * order. The next segment either shares the previous one's last point
 * (`start === end`, a corner written once, as matdyn.x does) or follows
 * it (`start === end + 1`): a joint when the two points coincide (a corner
 * written twice, as phonopy does), otherwise a break in the path.
 */
export interface SampledPath extends Sampled {
  readonly kind: "path";
  readonly segments: readonly PathSegment[];
}

/**
 * A full regular grid, every point listed in grid order with the first
 * index fastest: point i + n1·(j + n2·k) is `origin + [i/n1, j/n2, k/n3]`.
 */
export interface SampledGrid extends Sampled {
  readonly kind: "grid";
  readonly grid: KGrid;
}

/** Points with no structure: a single q-point, an irreducible mesh, a list. */
export interface SampledPoints extends Sampled {
  readonly kind: "points";
  /** [nkpts]: integration weights, e.g. of an irreducible mesh. */
  readonly weights?: Float64Array;
}

export type SampledKPoints = SampledPath | SampledGrid | SampledPoints;

/** Whether `x` is a SampledKPoints rather than a bare coordinate array. */
export function isSampledKPoints(x: unknown): x is SampledKPoints {
  return typeof x === "object" && x !== null && "kind" in x && "coords" in x;
}

/** Fractional coordinates of point `i`. */
export function kpointCoord(s: SampledKPoints, i: number): [number, number, number] {
  const o = 3 * i;
  return [s.coords[o], s.coords[o + 1], s.coords[o + 2]];
}

/**
 * A sampled path from its coordinates and segments, validated (see
 * {@link SampledPath}). Use {@link samplePath} to build one from labels.
 */
export function createSampledPath(
  coords: Float64Array | ArrayLike<number>,
  segments: readonly PathSegment[],
): SampledPath {
  const c = asCoords(coords);
  const path: SampledPath = { kind: "path", nkpts: c.length / 3, coords: c, segments };
  validatePath(path);
  return path;
}

/** Points with no structure, optionally weighted. */
export function samplePoints(
  coords: Float64Array | ArrayLike<number>,
  weights?: Float64Array | ArrayLike<number>,
): SampledPoints {
  const c = asCoords(coords);
  const nkpts = c.length / 3;
  if (weights === undefined) return { kind: "points", nkpts, coords: c };
  const w = weights instanceof Float64Array ? weights : Float64Array.from(weights);
  if (w.length !== nkpts) {
    throw new Error(`Expected ${nkpts} weights, got ${w.length}`);
  }
  return { kind: "points", nkpts, coords: c, weights: w };
}

/** Every point of a grid, in grid order (see {@link SampledGrid}). */
export function sampleGrid(grid: KGrid): SampledGrid {
  const [n1, n2, n3] = grid.mesh;
  const [o1, o2, o3] = grid.origin;
  const coords = new Float64Array(n1 * n2 * n3 * 3);
  let p = 0;
  for (let k = 0; k < n3; k++) {
    for (let j = 0; j < n2; j++) {
      for (let i = 0; i < n1; i++) {
        coords[p++] = o1 + i / n1;
        coords[p++] = o2 + j / n2;
        coords[p++] = o3 + k / n3;
      }
    }
  }
  return { kind: "grid", nkpts: n1 * n2 * n3, coords, grid };
}

function asCoords(coords: Float64Array | ArrayLike<number>): Float64Array {
  const c = coords instanceof Float64Array ? coords : Float64Array.from(coords);
  if (c.length % 3 !== 0) {
    throw new Error("k-point coordinates length must be a multiple of 3");
  }
  return c;
}

function validatePath({ nkpts, segments }: SampledPath): void {
  if (nkpts === 0) {
    if (segments.length > 0) throw new Error("A path with no k-points cannot have segments");
    return;
  }
  if (segments.length === 0) throw new Error("A path with k-points needs at least one segment");
  let prev: PathSegment | undefined;
  for (const s of segments) {
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start > s.end) {
      throw new Error(`Invalid path segment [${s.start}, ${s.end}]`);
    }
    if (!prev) {
      if (s.start !== 0) throw new Error(`The first path segment must start at 0, not ${s.start}`);
    } else if (s.start !== prev.end && s.start !== prev.end + 1) {
      throw new Error(`Path segment [${s.start}, ${s.end}] must start at ${prev.end} or ${prev.end + 1}`);
    } else if (s.start === prev.end && prev.to !== undefined && s.from !== undefined && prev.to !== s.from) {
      throw new Error(`k-point ${s.start} is labelled both '${prev.to}' and '${s.from}'`);
    }
    prev = s;
  }
  if (prev!.end !== nkpts - 1) {
    throw new Error(`The path segments end at ${prev!.end}, but there are ${nkpts} k-points`);
  }
}
