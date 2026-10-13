import { createLattice } from "@/core/lattice/lattice";
import { fractional } from "@/core/site/fractional";
import type { Structure } from "../structure";
import {
  adaptScale,
  assemble,
  atomScale,
  cellScale,
  dot,
  ensurePositiveVolume,
  forceSummary,
  hasConverged,
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

  function reset() {
    prevG = null;
    prevD = null;
    prevGNorm = 0;
    scale = 1;
  }

  function step(
    structure: Structure,
    forces: Float64Array,
    stress?: Float64Array,
  ): OptStep {
    const n = structure.sites.length;
    const { x, g, invB } = assemble(structure, forces, stress);
    const useCell = !!stress;

    if (prevG && (!prevD || prevD.length !== g.length)) reset();
    if (prevG) scale = adaptScale(scale, Math.sqrt(dot(g, g)), prevGNorm);
    prevGNorm = Math.sqrt(dot(g, g));
    let d = new Float64Array(g.length);
    if (prevG && prevD) {
      const gg = dot(g, g);
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

    const oldB = structure.lattice.basis.data;
    const newB = new Float64Array(9);
    for (let i = 0; i < 9; i++)
      newB[i] = oldB[i] + (dCell ? dCell[i] * aCell : 0);
    if (useCell) ensurePositiveVolume(newB, oldB);
    const newLattice = createLattice(newB);

    const sites = structure.sites.map((site, i) => ({
      ...site,
      frac: fractional(
        newLattice,
        new Float64Array([newX[i * 3], newX[i * 3 + 1], newX[i * 3 + 2]]),
      ),
    }));

    const { maxForce, maxStress } = forceSummary(forces, stress);
    return {
      structure: { lattice: newLattice, sites },
      converged: hasConverged(maxForce, maxStress, fmax, smax),
      maxForce,
      maxStress,
    };
  }

  return { step, reset };
}
