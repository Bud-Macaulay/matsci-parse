import { sameKPoint, type KPointLabel, type SampledPath } from "./sampled";
import { cartesianKPoints, labelPath, pathLabels } from "./path";
import type { Lattice } from "../lattice/lattice";
import type { Structure } from "../structure/structure";
import { getPath, type GetPathOptions } from "../structure/operations/symmetry/brilliounzone/seekpath";
import { getSymmetry } from "../structure/operations/symmetry/spglib";
import { reciprocalLatticeCrystallographic } from "../lattice/reciprocalLatticeCrystallographic";
import { metricTensor } from "../lattice/metricTensor";
import { createMatrix, fromRows, type Matrix } from "../matrix/matrix";
import { mul } from "../matrix/operations/mul";
import { sub } from "../matrix/operations/sub";
import { normInf } from "../matrix/operations/norms";
import { transpose } from "../matrix/operations/transpose";
import { inverse3x3 } from "../matrix/operations/inverse/inverse3x3";
import { cross } from "../matrix/operations/vector/cross";
import { dot } from "../matrix/operations/vector/dot";
import { norm } from "../matrix/operations/vector/norm";
import { vecMul } from "../matrix/operations/vector/vecMul";

/*
 * Naming the corners of a sampled path: generic labels for every corner,
 * or the high-symmetry points of the Brillouin zone. The coordinates are
 * fractional in the reciprocal of `lattice` / `structure.lattice`.
 */

/** sin(angle) below which three consecutive points count as collinear. */
const COLLINEAR_SIN = 0.05;

/**
 * Indices where the path changes direction, starts, ends or jumps, grouped
 * so that repeated visits to the same point share a group. These are the
 * points a band structure plot needs ticks at.
 */
export function pathCorners(path: SampledPath, lattice: Lattice): number[][] {
  const { nkpts, coords } = path;
  const cart = cartesianKPoints(path, lattice);
  const groups: number[][] = [];
  const add = (q: number) => {
    const group = groups.find((g) => sameKPoint(coords, g[0], q));
    if (group) group.push(q);
    else groups.push([q]);
  };

  if (nkpts === 0) return groups;
  add(0);
  for (let q = 1; q < nkpts - 1; q++) {
    if (!collinear(cart, q - 1, q, q + 1)) add(q);
  }
  if (nkpts > 1) add(nkpts - 1);
  return groups;
}

/**
 * Label every corner of the path (see {@link pathCorners}) that has no
 * label yet: a revisit of an already-labelled point takes that label,
 * others get a generic "Q_1", "Q_2", ... shared by repeated visits.
 * Existing labels are kept.
 */
export function labelPathCorners(path: SampledPath, lattice: Lattice): SampledPath {
  const labelled = new Map(pathLabels(path).map((l) => [l.index, l.label]));
  return labelPath(path, cornerLabels(path, lattice, labelled));
}

/** `labelled`, completed with labels for every unlabelled corner. */
function cornerLabels(path: SampledPath, lattice: Lattice, labelled: Map<number, string>): KPointLabel[] {
  let count = 0;
  for (const group of pathCorners(path, lattice)) {
    const missing = group.filter((q) => !labelled.has(q));
    if (missing.length === 0) continue;
    const known = group.find((q) => labelled.has(q));
    const label = known !== undefined ? labelled.get(known)! : `Q_${++count}`;
    for (const q of missing) labelled.set(q, label);
  }
  return sortedLabels(labelled);
}

/**
 * Label points that are symmetry-equivalent (under the crystal's point
 * group, time reversal and reciprocal lattice translations) to the
 * high-symmetry points of its Brillouin zone, as determined by seekpath
 * (HPKOT conventions; Γ is written "Γ"). Remaining corners of the path get
 * generic "Q_n" labels. Replaces any existing labels; segment boundaries
 * are kept.
 *
 * @param tolerance - Fractional-coordinate tolerance for a match; the
 *   default allows for the 4-decimal q-points written by matdyn.x.
 */
export async function labelPathHighSymmetry(
  path: SampledPath,
  structure: Structure,
  opts: GetPathOptions & { tolerance?: number } = {},
): Promise<SampledPath> {
  const { tolerance = 2e-3, symprec = 1e-4, ...pathOpts } = opts;
  const [seek, symmetry] = await Promise.all([
    getPath(structure, { symprec, ...pathOpts }),
    getSymmetry(structure, symprec),
  ]);
  const prim = primitiveInInputFrame(structure, seek.primitive_lattice, seek.rotation_matrix);

  const labelled = new Map<number, string>();
  if (prim) {
    // fractional (input reciprocal) → fractional (primitive reciprocal):
    // k = q · T with T = B · Pᵀ (rows: input reciprocal / primitive vectors)
    const b = reciprocalLatticeCrystallographic(structure.lattice).basis;
    const t = mul(b, transpose(prim));
    // each rotation W (acting on row vectors q · W) composed with T
    const transforms = fractionalRotations(structure, symmetry.calculationResults.operations).map(
      (w) => mul(w, t),
    );
    const points = Object.entries(seek.point_coords);

    for (let q = 0; q < path.nkpts; q++) {
      const qf = path.coords.subarray(3 * q, 3 * q + 3);
      // the images of q are the same for every candidate point
      const images = transforms.map((wt) => vecMul(qf, wt));
      const match = points.find(([, p]) =>
        images.some(
          (k) => equivalentModG(k, p, tolerance, 1) || equivalentModG(k, p, tolerance, -1),
        ),
      );
      if (match) labelled.set(q, match[0] === "GAMMA" ? "Γ" : match[0]);
    }
  }

  return labelPath(path, cornerLabels(path, structure.lattice, labelled));
}

/**
 * Point-group rotations W (x' = W x on fractional columns) of the crystal,
 * deduplicated. The storage order of moyo's matrices is resolved by
 * requiring the lattice metric be preserved: Wᵀ G W = G.
 */
function fractionalRotations(
  structure: Structure,
  operations: readonly { rotation: readonly number[] }[],
): Matrix[] {
  const g = metricTensor(structure.lattice);
  const tol = 1e-3 * (normInf(g) + 1);
  const preservesMetric = (w: Matrix) => normInf(sub(mul(transpose(w), mul(g, w)), g)) < tol;

  const seen = new Map<string, Matrix>();
  for (const { rotation } of operations) {
    const rowMajor = createMatrix(3, 3, rotation);
    const w = preservesMetric(rowMajor) ? rowMajor : transpose(rowMajor);
    seen.set(w.data.join(","), w);
  }
  return [...seen.values()];
}

function sortedLabels(map: Map<number, string>): KPointLabel[] {
  return [...map]
    .sort(([a], [b]) => a - b)
    .map(([index, label]) => ({ index, label }));
}

function collinear(cart: Float64Array, a: number, b: number, c: number): boolean {
  const step = (from: number, to: number) =>
    cart.subarray(3 * to, 3 * to + 3).map((x, j) => x - cart[3 * from + j]);
  const u = step(a, b);
  const v = step(b, c);
  const norms = norm(u) * norm(v);
  // a zero-length step or a reversal (dot ≤ 0) is a corner: the path
  // doubles back, e.g. a jump X → R right after a segment R → X
  return norms > 0 && dot(u, v) > 0 && norm(cross(u, v)) <= COLLINEAR_SIN * norms;
}

/** Whether `sign` · k equals p up to a reciprocal lattice vector (−1: time reversal). */
function equivalentModG(k: Float64Array, p: readonly number[], tol: number, sign: 1 | -1): boolean {
  return k.every((x, j) => {
    const d = sign * x - p[j];
    return Math.abs(d - Math.round(d)) < tol;
  });
}

/**
 * The seekpath primitive lattice vectors expressed in the input structure's
 * Cartesian frame. seekpath reports them in the standardized frame, related
 * to the input by `rotation_matrix` (std = Rᵀ · input, column vectors); as
 * rows that is p_input = p_std · Rᵀ. The result is checked: the input cell
 * must be an integer combination of the primitive vectors. Returns null if
 * it is not (e.g. the symmetry search idealized the cell too far).
 */
function primitiveInInputFrame(
  structure: Structure,
  primitive: number[][],
  rotation: number[][],
): Matrix | null {
  const p = mul(fromRows(primitive), transpose(fromRows(rotation)));
  // N = A_input · P⁻¹ must be an integer matrix
  const n = mul(structure.lattice.basis, inverse3x3(p));
  const err = Math.max(...Array.from(n.data, (x) => Math.abs(x - Math.round(x))));
  return err < 1e-2 ? p : null;
}
