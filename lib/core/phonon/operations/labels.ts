import type { PhononBands, QPointLabel } from "../phonon";
import { cartesianQPoints } from "./path";
import { getPath, type GetPathOptions } from "../../structure/operations/symmetry/brilliounzone/seekpath";
import { getSymmetry } from "../../structure/operations/symmetry/spglib";
import { reciprocalLatticeCrystallographic } from "../../lattice/reciprocalLatticeCrystallographic";
import { metricTensor } from "../../lattice/metricTensor";
import { createMatrix, fromRows, type Matrix } from "../../matrix/matrix";
import { mul } from "../../matrix/operations/mul";
import { sub } from "../../matrix/operations/sub";
import { normInf } from "../../matrix/operations/norms";
import { transpose } from "../../matrix/operations/transpose";
import { inverse3x3 } from "../../matrix/operations/inverse/inverse3x3";
import { cross } from "../../matrix/operations/vector/cross";
import { dot } from "../../matrix/operations/vector/dot";
import { norm } from "../../matrix/operations/vector/norm";
import { vecMul } from "../../matrix/operations/vector/vecMul";

/** sin(angle) below which three consecutive q-points count as collinear. */
const COLLINEAR_SIN = 0.05;

/**
 * Indices where the path changes direction, starts, ends or jumps, grouped
 * so that repeated visits to the same q-point share a group. These are the
 * points a band structure plot needs ticks at.
 */
export function cornerQPoints(bands: PhononBands): number[][] {
  const { nqpts, qpoints } = bands;
  const cart = cartesianQPoints(bands);
  const groups: number[][] = [];
  const add = (q: number) => {
    const group = groups.find((g) => samePoint(qpoints, g[0], q));
    if (group) group.push(q);
    else groups.push([q]);
  };

  if (nqpts === 0) return groups;
  add(0);
  for (let q = 1; q < nqpts - 1; q++) {
    if (!collinear(cart, q - 1, q, q + 1)) add(q);
  }
  if (nqpts > 1) add(nqpts - 1);
  return groups;
}

/**
 * Label every corner of the path (see {@link cornerQPoints}) that has no
 * label yet: a revisit of an already-labelled q-point takes that label,
 * others get a generic "Q_1", "Q_2", ... shared by repeated visits.
 * Existing labels are kept.
 */
export function labelCorners(bands: PhononBands): PhononBands {
  const labelled = new Map(bands.labels.map((l) => [l.index, l.label]));
  let count = 0;
  for (const group of cornerQPoints(bands)) {
    const missing = group.filter((q) => !labelled.has(q));
    if (missing.length === 0) continue;
    const known = group.find((q) => labelled.has(q));
    const label = known !== undefined ? labelled.get(known)! : `Q_${++count}`;
    for (const q of missing) labelled.set(q, label);
  }
  return { ...bands, labels: sortedLabels(labelled) };
}

/**
 * Label q-points that are symmetry-equivalent (under the crystal's point
 * group, time reversal and reciprocal lattice translations) to the
 * high-symmetry points of its Brillouin zone, as determined by seekpath
 * (HPKOT conventions; Γ is written "Γ"). Remaining corners of the path get
 * generic "Q_n" labels. Replaces any existing labels.
 *
 * @param tolerance - Fractional-coordinate tolerance for a match; the
 *   default allows for the 4-decimal q-points written by matdyn.x.
 */
export async function labelHighSymmetryPoints(
  bands: PhononBands,
  opts: GetPathOptions & { tolerance?: number } = {},
): Promise<PhononBands> {
  const { tolerance = 2e-3, symprec = 1e-4, ...pathOpts } = opts;
  const [path, symmetry] = await Promise.all([
    getPath(bands.structure, { symprec, ...pathOpts }),
    getSymmetry(bands.structure, symprec),
  ]);
  const prim = primitiveInInputFrame(bands, path.primitive_lattice, path.rotation_matrix);

  const labelled = new Map<number, string>();
  if (prim) {
    // fractional (input reciprocal) → fractional (primitive reciprocal):
    // k = q · T with T = B · Pᵀ (rows: input reciprocal / primitive vectors)
    const b = reciprocalLatticeCrystallographic(bands.structure.lattice).basis;
    const t = mul(b, transpose(prim));
    // each rotation W (acting on row vectors q · W) composed with T
    const transforms = fractionalRotations(bands, symmetry.calculationResults.operations).map(
      (w) => mul(w, t),
    );
    const points = Object.entries(path.point_coords);

    for (let q = 0; q < bands.nqpts; q++) {
      const qf = bands.qpoints.subarray(3 * q, 3 * q + 3);
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

  return labelCorners({ ...bands, labels: sortedLabels(labelled) });
}

/**
 * Point-group rotations W (x' = W x on fractional columns) of the crystal,
 * deduplicated. The storage order of moyo's matrices is resolved by
 * requiring the lattice metric be preserved: Wᵀ G W = G.
 */
function fractionalRotations(
  bands: PhononBands,
  operations: readonly { rotation: readonly number[] }[],
): Matrix[] {
  const g = metricTensor(bands.structure.lattice);
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

function sortedLabels(map: Map<number, string>): QPointLabel[] {
  return [...map]
    .sort(([a], [b]) => a - b)
    .map(([index, label]) => ({ index, label }));
}

function samePoint(qpoints: Float64Array, a: number, b: number): boolean {
  return [0, 1, 2].every((j) => Math.abs(qpoints[3 * a + j] - qpoints[3 * b + j]) < 1e-3);
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
  bands: PhononBands,
  primitive: number[][],
  rotation: number[][],
): Matrix | null {
  const p = mul(fromRows(primitive), transpose(fromRows(rotation)));
  // N = A_input · P⁻¹ must be an integer matrix
  const n = mul(bands.structure.lattice.basis, inverse3x3(p));
  const err = Math.max(...Array.from(n.data, (x) => Math.abs(x - Math.round(x))));
  return err < 1e-2 ? p : null;
}
