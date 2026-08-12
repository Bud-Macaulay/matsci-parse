/** A three-dimensional vector. */
export type Vec3 = readonly [number, number, number];
export type GridShape = readonly [number, number, number];

/** A point in reciprocal space, expressed in fractional reciprocal coordinates. */
export interface KPoint {
  readonly coordinate: Vec3;
}

/** An explicit collection of k-points. */
export interface KPointSet {
  readonly points: readonly KPoint[];
  readonly weights?: readonly number[];
}

/**
 * A regular reciprocal-space grid.
 *
 * The coordinate of grid index [i, j, k] is:
 *
 *   origin + [i / nx, j / ny, k / nz]
 *
 * Coordinates are fractional reciprocal coordinates.
 */
export interface KGrid {
  readonly mesh: GridShape;
  readonly origin: Vec3;
}

/**
 * A path through reciprocal space.
 *
 * `points` defines named points in fractional reciprocal coordinates.
 * Each segment connects two named points.
 */
export interface KPath {
  readonly points: Readonly<Record<string, Vec3>>;
  readonly segments: readonly (readonly [string, string])[];
}
