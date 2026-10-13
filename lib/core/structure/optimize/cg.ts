import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { dot } from "@/core/matrix/operations/vector/dot";
import { norm } from "@/core/matrix/operations/vector/norm";
import type { Structure } from "../structure";
import {
  adaptScale,
  assemble,
  atomScale,
  cellScale,
  ensurePositiveVolume,
  forceSummary,
  hasConverged,
  rebuild,
  type Optimizer,
  type OptimizerOptions,
  type OptStep,
} from "./common";

/** Polak-Ribière CG with Powell restarts, unit step inside the shared
 * trust region. Same signature as FIRE; no energies needed. */
export function createCG(opts: OptimizerOptions = {}): Optimizer {
  const fmax = opts.fmax ?? 0.05;
  const smax = opts.smax ?? 0.01;
  const maxStep = opts.maxStep ?? 0.2;
  const maxCellStrain = opts.maxCellStrain ?? 0.02;

  let prevG: Float64Array | null = null;
  let prevD: Float64Array | null = null;
  let prevGNorm = 0;
  let scale = 1;
  // Reference cell for the position coordinates while relaxing the cell.
  let refB: Matrix | null = null;

  function reset() {
    prevG = null;
    prevD = null;
    prevGNorm = 0;
    scale = 1;
    refB = null;
  }

  function step(
    structure: Structure,
    forces: Float64Array,
    stress?: Float64Array,
  ): OptStep {
    const n = structure.sites.length;
    const useCell = !!stress;
    if (prevG && prevG.length !== 3 * n + (useCell ? 9 : 0)) reset();
    const B = structure.lattice.basis.data;
    const basis = structure.lattice.basis;
    const ref = useCell ? (refB ??= createMatrix(3, 3, B)) : basis;
    const { x, g, invB } = assemble(structure, forces, stress, ref);
    const gNorm = norm(g);
    if (prevG) scale = adaptScale(scale, gNorm, prevGNorm);
    prevGNorm = gNorm;
    let d = new Float64Array(g.length);
    if (prevG && prevD) {
      const gg = gNorm * gNorm;
      const denom = dot(prevG, prevG);
      let beta = denom > 0 ? (gg - dot(g, prevG)) / denom : 0;
      if (beta < 0 || Math.abs(dot(g, prevG)) > 0.2 * gg) beta = 0;
      for (let i = 0; i < d.length; i++) d[i] = -g[i] + beta * prevD[i];
      if (dot(d, g) > 0) for (let i = 0; i < d.length; i++) d[i] = -g[i];
    } else {
      for (let i = 0; i < d.length; i++) d[i] = -g[i];
    }
    prevG = g;
    prevD = d;

    const dPos = d.subarray(0, 3 * n);
    const dCell = useCell ? d.subarray(3 * n) : null;
    const aPos = scale * atomScale(dPos, scale, maxStep);
    const aCell =
      dCell && invB
        ? scale * cellScale(dCell, scale, invB, maxCellStrain)
        : scale;

    const newX = new Float64Array(3 * n);
    for (let i = 0; i < 3 * n; i++) newX[i] = x[i] + dPos[i] * aPos;

    const newB = new Float64Array(9);
    for (let i = 0; i < 9; i++) newB[i] = B[i] + (dCell ? dCell[i] * aCell : 0);
    if (useCell) ensurePositiveVolume(newB, B);

    const { maxForce, maxStress } = forceSummary(forces, stress);
    return {
      structure: rebuild(structure, newX, newB, ref),
      converged: hasConverged(maxForce, maxStress, fmax, smax),
      maxForce,
      maxStress,
    };
  }

  return { step, reset };
}
