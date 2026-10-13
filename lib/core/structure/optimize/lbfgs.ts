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

const MEMORY = 10;

/** L-BFGS without line search: unit quasi-Newton step inside the shared
 * trust region (maxStep / maxCellStrain). No energies needed, so the
 * signature matches FIRE exactly. Skips updates on non-positive
 * curvature instead of damping. */
export function createLBFGS(opts: OptimizerOptions = {}): Optimizer {
  const fmax = opts.fmax ?? 0.05;
  const smax = opts.smax ?? 0.01;
  const maxStep = opts.maxStep ?? 0.2;
  const maxCellStrain = opts.maxCellStrain ?? 0.02;

  let sHist: Float64Array[] = [];
  let yHist: Float64Array[] = [];
  let rhoHist: number[] = [];
  let prevX: Float64Array | null = null;
  let prevG: Float64Array | null = null;
  let prevGNorm = 0;
  let scale = 1;

  function reset() {
    sHist = [];
    yHist = [];
    rhoHist = [];
    prevX = null;
    prevG = null;
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

    if (prevX && (prevX.length !== x.length || !prevG)) reset();
    const gNorm = Math.sqrt(dot(g, g));
    if (prevG) scale = adaptScale(scale, gNorm, prevGNorm);
    prevGNorm = gNorm;
    if (prevX && prevG) {
      const s = new Float64Array(x.length);
      const y = new Float64Array(x.length);
      for (let i = 0; i < x.length; i++) {
        s[i] = x[i] - prevX[i];
        y[i] = g[i] - prevG[i];
      }
      if (dot(y, s) > 1e-10) {
        sHist.push(s);
        yHist.push(y);
        rhoHist.push(1 / dot(y, s));
        if (sHist.length > MEMORY) {
          sHist.shift();
          yHist.shift();
          rhoHist.shift();
        }
      }
    }

    // Two-loop recursion; first step is steepest descent.
    const m = sHist.length;
    const alpha = new Float64Array(m);
    const q = Float64Array.from(g);
    for (let i = m - 1; i >= 0; i--) {
      alpha[i] = rhoHist[i] * dot(sHist[i], q);
      for (let j = 0; j < q.length; j++) q[j] -= alpha[i] * yHist[i][j];
    }
    let gamma = 1;
    if (m > 0) {
      const yy = dot(yHist[m - 1], yHist[m - 1]);
      if (yy > 0) gamma = dot(yHist[m - 1], sHist[m - 1]) / yy;
    }
    const r = new Float64Array(q.length);
    for (let j = 0; j < q.length; j++) r[j] = gamma * q[j];
    for (let i = 0; i < m; i++) {
      const beta = rhoHist[i] * dot(yHist[i], r);
      for (let j = 0; j < r.length; j++)
        r[j] += sHist[i][j] * (alpha[i] - beta);
    }

    const dPos = r.subarray(0, 3 * n);
    const dCell = useCell ? r.subarray(3 * n) : null;
    const aPos = scale * atomScale(dPos, scale, maxStep);
    const aCell =
      dCell && invB
        ? scale * cellScale(dCell, scale, invB, maxCellStrain)
        : scale;

    const newX = new Float64Array(3 * n);
    for (let i = 0; i < 3 * n; i++) newX[i] = x[i] - dPos[i] * aPos;

    const oldB = structure.lattice.basis.data;
    const newB = new Float64Array(9);
    for (let i = 0; i < 9; i++)
      newB[i] = oldB[i] - (dCell ? dCell[i] * aCell : 0);
    if (useCell) ensurePositiveVolume(newB, oldB);
    const newLattice = createLattice(newB);

    const sites = structure.sites.map((site, i) => ({
      ...site,
      frac: fractional(
        newLattice,
        new Float64Array([newX[i * 3], newX[i * 3 + 1], newX[i * 3 + 2]]),
      ),
    }));

    prevX = x;
    prevG = g;

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
