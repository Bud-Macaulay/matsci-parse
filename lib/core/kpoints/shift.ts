import type { GridShape, KGrid, Vec3 } from "./kpoints";

/**
 * Conversions between a {@link KGrid}'s `origin` (the fractional coordinate of
 * grid index [0, 0, 0]) and the offsets that codes write, which are measured
 * in grid steps (1 step = 1/n along an axis):
 *
 * - VASP Gamma-centered:  k = (n_i + s_i) / N_i
 * - VASP Monkhorst-Pack:  k = (n_i + s_i + (1 - N_i)/2) / N_i
 * - QE automatic:         sk_i in {0, 1}, a displacement of sk_i / 2 steps
 *
 * Every k-point adapter goes through these helpers rather than doing its own
 * arithmetic. The origin is the single source of truth; `KGrid.scheme` is
 * derived from it with {@link gridScheme}.
 */

const TOL = 1e-8;

/** Monkhorst-Pack offset (1 - n)/2, in grid steps. */
function mpOffsetSteps(n: number): number {
  return (1 - n) / 2;
}

/** Reduce a value in grid steps to [0, 1), snapping values near 1 to 0. */
function reduceSteps(steps: number): number {
  const r = steps - Math.floor(steps);
  return r > 1 - TOL || r < TOL ? 0 : r;
}

/**
 * Offset of the grid from Gamma, in grid steps, reduced to [0, 1) per axis.
 * Shifting the origin by a whole step gives the same set of k-points, so this
 * is the canonical description of where the mesh sits.
 */
export function offsetSteps(mesh: GridShape, origin: Vec3): Vec3 {
  return [
    reduceSteps(origin[0] * mesh[0]),
    reduceSteps(origin[1] * mesh[1]),
    reduceSteps(origin[2] * mesh[2]),
  ];
}

/** Origin of a mesh offset from Gamma by `steps` grid steps per axis. */
export function originFromSteps(mesh: GridShape, steps: Vec3): Vec3 {
  return [steps[0] / mesh[0], steps[1] / mesh[1], steps[2] / mesh[2]];
}

/**
 * Whether the mesh is exactly a Monkhorst-Pack mesh: on every axis the offset
 * is the MP one (half a step for even n, none for odd n).
 */
export function isMonkhorstPack(mesh: GridShape, origin: Vec3): boolean {
  const steps = offsetSteps(mesh, origin);
  return steps.every(
    (s, i) => Math.abs(s - reduceSteps(mpOffsetSteps(mesh[i]))) < TOL,
  );
}

/** The scheme label matching an origin: "monkhorst-pack" or "gamma-centered". */
export function gridScheme(mesh: GridShape, origin: Vec3): KGrid["scheme"] {
  return isMonkhorstPack(mesh, origin) && mesh.some((n) => n % 2 === 0)
    ? "monkhorst-pack"
    : "gamma-centered";
}

/** Build a KGrid from a mesh and its origin, deriving the scheme. */
export function makeGrid(mesh: GridShape, origin: Vec3): KGrid {
  return { kind: "grid", mesh, origin, scheme: gridScheme(mesh, origin) };
}

// ──────────────────────────────────────────────────────────────────────
//  VASP
// ──────────────────────────────────────────────────────────────────────

/** Origin of a VASP automatic mesh (`shift` in grid steps). */
export function originFromVasp(
  mesh: GridShape,
  shift: Vec3,
  monkhorstPack: boolean,
): Vec3 {
  const steps = (i: number) =>
    shift[i] + (monkhorstPack ? mpOffsetSteps(mesh[i]) : 0);
  return originFromSteps(mesh, [steps(0), steps(1), steps(2)]);
}

/**
 * How to write a mesh as a VASP automatic KPOINTS. The origin decides where
 * the points are; `scheme` only picks between equivalent labels (for odd
 * meshes MP and Gamma-centered coincide). Written as Monkhorst-Pack with no
 * shift when the grid is exactly MP and either labelled MP or only expressible
 * as MP-without-shift (some axis even); otherwise Gamma-centered with its
 * offset in grid steps.
 */
export function vaspMesh(
  grid: Pick<KGrid, "mesh" | "origin" | "scheme">,
): { monkhorstPack: boolean; shift: Vec3 } {
  const { mesh, origin, scheme } = grid;
  if (
    isMonkhorstPack(mesh, origin) &&
    (scheme === "monkhorst-pack" || gridScheme(mesh, origin) === "monkhorst-pack")
  ) {
    return { monkhorstPack: true, shift: [0, 0, 0] };
  }
  return { monkhorstPack: false, shift: offsetSteps(mesh, origin) };
}

// ──────────────────────────────────────────────────────────────────────
//  Quantum ESPRESSO
// ──────────────────────────────────────────────────────────────────────

/** Origin of a QE automatic grid (`shift` flags of 0 or 1). */
export function originFromQE(mesh: GridShape, shift: Vec3): Vec3 {
  return originFromSteps(mesh, [shift[0] / 2, shift[1] / 2, shift[2] / 2]);
}

/**
 * QE automatic shift flags for a mesh. QE can only offset a grid by zero or
 * half a step per axis; any other origin throws.
 */
export function qeShift(mesh: GridShape, origin: Vec3): [number, number, number] {
  const steps = offsetSteps(mesh, origin);
  return steps.map((s, i) => {
    if (Math.abs(s) < TOL) return 0;
    if (Math.abs(s - 0.5) < TOL) return 1;
    throw new Error(
      `QE automatic grids can only be shifted by 0 or half a step; axis ${i + 1} is offset by ${s} steps`,
    );
  }) as [number, number, number];
}
