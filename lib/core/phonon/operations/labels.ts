import type { PhononBands, QPointLabel } from "../phonon";
import { cartesianQPoints } from "./path";
import { getPath, type GetPathOptions } from "../../structure/operations/symmetry/brilliounzone/seekpath";
import { getSymmetry } from "../../structure/operations/symmetry/spglib";
import { reciprocalLatticeCrystallographic } from "../../lattice/reciprocalLatticeCrystallographic";
import { fromRows, toRows } from "../../matrix/matrix";
import { mul } from "../../matrix/operations/mul";
import { transpose } from "../../matrix/operations/transpose";
import { inverse3x3 } from "../../matrix/operations/inverse/inverse3x3";

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
    // k_j = q · (b_i · p_j)
    const b = toRows(reciprocalLatticeCrystallographic(bands.structure.lattice).basis);
    const t = b.map((bi) => prim.map((pj) => bi[0] * pj[0] + bi[1] * pj[1] + bi[2] * pj[2]));
    const rotations = fractionalRotations(bands, symmetry.calculationResults.operations);
    const points = Object.entries(path.point_coords);

    for (let q = 0; q < bands.nqpts; q++) {
      const qf = [0, 1, 2].map((j) => bands.qpoints[3 * q + j]);
      const match = points.find(([, p]) =>
        rotations.some((w) => {
          const k = rowTimes(rowTimes(qf, w), t);
          return (
            equivalentModG(k, p, tolerance) ||
            equivalentModG(k.map((x) => -x), p, tolerance)
          );
        }),
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
): number[][][] {
  const a = toRows(bands.structure.lattice.basis);
  const g = a.map((ai) => a.map((aj) => ai[0] * aj[0] + ai[1] * aj[1] + ai[2] * aj[2]));
  const preservesMetric = (w: number[][]) =>
    [0, 1, 2].every((i) =>
      [0, 1, 2].every((j) => {
        let x = 0;
        for (let k = 0; k < 3; k++) for (let l = 0; l < 3; l++) x += w[k][i] * g[k][l] * w[l][j];
        return Math.abs(x - g[i][j]) < 1e-3 * (Math.abs(g[i][j]) + 1);
      }),
    );

  const seen = new Map<string, number[][]>();
  for (const { rotation: r } of operations) {
    const rowMajor = [0, 1, 2].map((i) => [r[3 * i], r[3 * i + 1], r[3 * i + 2]]);
    const colMajor = [0, 1, 2].map((i) => [r[i], r[3 + i], r[6 + i]]);
    const w = preservesMetric(rowMajor) ? rowMajor : colMajor;
    seen.set(w.flat().join(","), w);
  }
  return [...seen.values()];
}

function rowTimes(v: number[], m: number[][]): number[] {
  return [0, 1, 2].map((j) => v[0] * m[0][j] + v[1] * m[1][j] + v[2] * m[2][j]);
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
  const u = [0, 1, 2].map((j) => cart[3 * b + j] - cart[3 * a + j]);
  const v = [0, 1, 2].map((j) => cart[3 * c + j] - cart[3 * b + j]);
  const cross = Math.hypot(
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  );
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const norms = Math.hypot(...u) * Math.hypot(...v);
  // a zero-length step or a reversal (dot ≤ 0) is a corner: the path
  // doubles back, e.g. a jump X → R right after a segment R → X
  return norms > 0 && dot > 0 && cross <= COLLINEAR_SIN * norms;
}

function equivalentModG(k: number[], p: readonly number[], tol: number): boolean {
  return k.every((x, j) => {
    const d = x - p[j];
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
): number[][] | null {
  const p = mul(fromRows(primitive), transpose(fromRows(rotation)));
  // N = A_input · P⁻¹ must be an integer matrix
  const n = mul(bands.structure.lattice.basis, inverse3x3(p));
  const err = Math.max(...Array.from(n.data, (x) => Math.abs(x - Math.round(x))));
  return err < 1e-2 ? toRows(p) : null;
}
