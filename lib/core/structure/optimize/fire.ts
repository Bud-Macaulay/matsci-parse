import { getElement } from "@/core/data/periodictable/atomicData";
import { elementSymbolOf } from "@/core/data/periodictable/isotopes";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { dot } from "@/core/matrix/operations/vector/dot";
import { norm } from "@/core/matrix/operations/vector/norm";
import type { Structure } from "../structure";
import {
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

const N_MIN = 5;
const F_INC = 1.1;
const F_DEC = 0.5;
const ALPHA_START = 0.1;
const F_ALPHA = 0.99;

export interface FIREOptions extends OptimizerOptions {
  /** Initial timestep. Default 0.1. */
  dt?: number;
  /** Maximum timestep. Default 1.0. */
  dtMax?: number;
}

/**
 * FIRE optimizer (positions + optional cell) with the state in a closure —
 * no classes. Loop: `forces = calc(s); ({ structure: s, converged } =
 * opt.step(s, forces, stress?))`.
 *
 * Cell block: generalized force on the lattice components is
 * F_B = -V·B⁻ᵀ·σ (rows are lattice vectors; see cellGeneralizedForces).
 * Positions live in a fixed reference cell, so cell moves carry the atoms
 * along (see assemble). Stress sign convention: positive = tensile.
 */
export function createFIRE(opts: FIREOptions = {}): Optimizer {
  const dtMax = opts.dtMax ?? 1.0;
  const fmax = opts.fmax ?? 0.05;
  const smax = opts.smax ?? 0.01;
  const maxStep = opts.maxStep ?? 0.2;
  const maxCellStrain = opts.maxCellStrain ?? 0.02;

  let dt = opts.dt ?? 0.1;
  let alpha = ALPHA_START;
  let nSteps = 0;
  let vPos: Float64Array | null = null;
  const vCell = new Float64Array(9);
  const warnedSpecies = new Set<string>();
  // Reference cell for the position coordinates while relaxing the cell.
  let refB: Matrix | null = null;

  function reset() {
    vPos = null;
    vCell.fill(0);
    dt = opts.dt ?? 0.1;
    alpha = ALPHA_START;
    nSteps = 0;
    warnedSpecies.clear();
    refB = null;
  }

  /** Per-site mass: explicit `properties.mass` wins, else the periodic table
   * via the (isotope-stripped) species symbol. Unknown species warn once and
   * fall back to 1.0 rather than aborting the relaxation. */
  function massesFor(structure: Structure): Float64Array {
    return Float64Array.from(
      structure.sites.map((site) => {
        const prop = (site.properties as { mass?: unknown } | undefined)?.mass;
        if (typeof prop === "number" && Number.isFinite(prop) && prop > 0) {
          return prop;
        }
        const info = getElement(elementSymbolOf(site.species.symbol));
        if (info && Number.isFinite(info.mass) && info.mass > 0) {
          return info.mass;
        }
        if (!warnedSpecies.has(site.species.symbol)) {
          warnedSpecies.add(site.species.symbol);
          console.warn(
            `createFIRE: no mass for species '${site.species.symbol}', using 1.0`,
          );
        }
        return 1.0;
      }),
    );
  }

  function step(
    structure: Structure,
    forces: Float64Array,
    stress?: Float64Array,
  ): OptStep {
    const n = structure.sites.length;
    const B = structure.lattice.basis.data;
    const basis = structure.lattice.basis;
    const ref = stress ? (refB ??= createMatrix(3, 3, B)) : basis;
    const { x, g, invB } = assemble(structure, forces, stress, ref);

    // Generalized forces in optimizer coordinates (atoms, then cell).
    const F = new Float64Array(3 * n);
    for (let i = 0; i < 3 * n; i++) F[i] = -g[i];
    let cellF: Float64Array | null = null;
    if (stress) {
      cellF = new Float64Array(9);
      for (let i = 0; i < 9; i++) cellF[i] = -g[3 * n + i];
    }

    if (!vPos || vPos.length !== 3 * n) {
      vPos = new Float64Array(3 * n);
      vCell.fill(0);
    }

    // v += F·dt/m (per-atom masses; cell block is massless)
    const masses = massesFor(structure);
    for (let i = 0; i < 3 * n; i++)
      vPos[i] += (F[i] * dt) / masses[(i / 3) | 0];
    if (cellF) for (let i = 0; i < 9; i++) vCell[i] += cellF[i] * dt;

    // Power: adapt along the force direction.
    let p = dot(F, vPos);
    if (cellF) p += dot(cellF, vCell);

    if (p > 0) {
      nSteps++;
      if (nSteps > N_MIN) {
        dt = Math.min(dt * F_INC, dtMax);
        alpha *= F_ALPHA;
      }
      // Norms over the combined (atoms, cell) vector.
      const normF = Math.hypot(norm(F), cellF ? norm(cellF) : 0);
      const normV = Math.hypot(norm(vPos), cellF ? norm(vCell) : 0);
      if (normF > 0 && normV > 0) {
        const mix = (alpha * normV) / normF;
        for (let i = 0; i < 3 * n; i++) {
          vPos[i] = (1 - alpha) * vPos[i] + mix * F[i];
        }
        if (cellF) {
          for (let i = 0; i < 9; i++) {
            vCell[i] = (1 - alpha) * vCell[i] + mix * cellF[i];
          }
        }
      }
    } else {
      vPos.fill(0);
      vCell.fill(0);
      alpha = ALPHA_START;
      dt *= F_DEC;
      nSteps = 0;
    }

    // Advance positions and (if relaxing) the cell, then re-fractionalize.
    // Trust radii: atoms are capped by displacement, the cell by strain.
    // Each block gets its own scale so a huge cell force cannot freeze
    // the atoms and vice versa.
    const sdtPos = dt * atomScale(vPos, dt, maxStep);
    const newX = new Float64Array(3 * n);
    for (let i = 0; i < 3 * n; i++) newX[i] = x[i] + vPos[i] * sdtPos;

    let sdtCell = dt;
    if (cellF && invB) sdtCell = dt * cellScale(vCell, dt, invB, maxCellStrain);

    const newB = new Float64Array(9);
    for (let i = 0; i < 9; i++)
      newB[i] = B[i] + (cellF ? vCell[i] * sdtCell : 0);
    if (cellF && !ensurePositiveVolume(newB, B)) vCell.fill(0);

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
