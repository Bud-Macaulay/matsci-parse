/** A three-dimensional vector. */
export type Vec3 = readonly [number, number, number];
export type GridShape = readonly [number, number, number];

/** A point in reciprocal space, expressed in fractional reciprocal coordinates. */
export interface KPoint {
  readonly coordinate: Vec3;
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
  readonly kind: "grid";
  readonly mesh: GridShape;
  readonly origin: Vec3;
  /**
   * How the grid points are positioned about the origin. A Monkhorst-Pack
   * grid is symmetric about the origin; a Gamma-centered grid includes it.
   */
  readonly scheme: "monkhorst-pack" | "gamma-centered";
}

/** An explicit collection of k-points. */
export interface KPointSet {
  readonly kind: "points";
  readonly points: readonly KPoint[];
  readonly weights?: readonly number[];
  /**
   * Units the point coordinates are expressed in. Defaults to "reciprocal"
   * (fractional reciprocal coordinates).
   */
  readonly coordinateSystem?: "reciprocal" | "cartesian";
}

/**
 * A path through reciprocal space.
 *
 * `points` defines named points in fractional reciprocal coordinates.
 * Each segment connects two named points.
 */
export interface KPath {
  readonly kind: "path";
  readonly points: Readonly<Record<string, Vec3>>;
  readonly segments: readonly (readonly [string, string])[];
  /**
   * Number of k-points interpolated per segment when serializing (a count,
   * not a physical spacing).  Output adapters fall back to their own default
   * (typically 40) when this field is undefined.
   */
  readonly density?: number;
}

/** The canonical representation of any k-point specification. */
export type KPoints = KGrid | KPointSet | KPath;
