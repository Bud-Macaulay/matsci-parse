import { createLattice } from "@/core/lattice/lattice";
import { determinant } from "@/core/matrix/operations/determinant";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { getElement } from "@/core/data/periodictable/atomicData";
import { elementSymbolOf } from "@/core/data/periodictable/isotopes";
import { cartesian } from "@/core/site/cartesian";
import { fractional } from "@/core/site/fractional";
import type { Structure } from "../structure";

const N_MIN = 5;
const F_INC = 1.1;
const F_DEC = 0.5;
const ALPHA_START = 0.1;
const F_ALPHA = 0.99;

export interface FIREOptions {
  /** Initial timestep. Default 0.1. */
  dt?: number;
  /** Maximum timestep. Default 1.0. */
  dtMax?: number;
  /** Convergence: max Cartesian force component. Default 0.05. */
  fmax?: number;
  /** Convergence: max stress component (only when stress is given). Default 0.01. */
  smax?: number;
  /** Scales the cell block relative to positions. Default 1.0. */
  cellWeight?: number;
  /** Trust radius: max Cartesian displacement per atom per step (Å).
   * Default 0.2. Prevents overshoot into untrained model regions. */
  maxStep?: number;
}

export interface OptStep {
  structure: Structure;
  converged: boolean;
  maxForce: number;
  maxStress: number | null;
}

/**
 * FIRE optimizer (positions + optional cell) with the state in a closure —
 * no classes. Loop: `forces = calc(s); ({ structure: s, converged } =
 * opt.step(s, forces, stress?))`.
 *
 * Cell block: for a deformation B' = (I+ε)B, dE = V·σ:ε, so the generalized
 * force on lattice components is F_B = -V·σ·B⁻ᵀ (/ cellWeight). Stress sign
 * convention: positive = tensile.
 */
export function createFIRE(opts: FIREOptions = {}) {
  const dtMax = opts.dtMax ?? 1.0;
  const fmax = opts.fmax ?? 0.05;
  const smax = opts.smax ?? 0.01;
  const cellWeight = opts.cellWeight ?? 1.0;
  const maxStep = opts.maxStep ?? 0.2;

  let dt = opts.dt ?? 0.1;
  let alpha = ALPHA_START;
  let nSteps = 0;
  let vPos: Float64Array | null = null;
  const vCell = new Float64Array(9);
  const warnedSpecies = new Set<string>();

  function reset() {
    vPos = null;
    vCell.fill(0);
    dt = opts.dt ?? 0.1;
    alpha = ALPHA_START;
    nSteps = 0;
    warnedSpecies.clear();
  }

  /** Per-site mass: explicit `properties.mass` wins, else the periodic table
   * via the (isotope-stripped) species symbol. Unknown species warn once and
   * fall back to 1.0 rather than aborting the relaxation. */
  function massesFor(structure: Structure): Float64Array {
    return Float64Array.from(structure.sites.map((site) => {
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
    }));
  }

  function step(
    structure: Structure,
    forces: Float64Array,
    stress?: Float64Array,
  ): OptStep {
    const n = structure.sites.length;

    // Current Cartesian positions.
    const x = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      const c = cartesian(structure.lattice, structure.sites[i]);
      x[i * 3] = c[0];
      x[i * 3 + 1] = c[1];
      x[i * 3 + 2] = c[2];
    }

    const F = Float64Array.from(forces);

    // Cell generalized forces (9 lattice components), or null.
    let cellF: Float64Array | null = null;
    if (stress) {
      const B = structure.lattice.basis;
      const V = Math.abs(determinant(B));
      const invB = inverse3x3(B).data; // row-major B⁻¹
      // B⁻ᵀ[i][j] = invB[j*3+i]; F_B = -V/w · σ·B⁻ᵀ
      cellF = new Float64Array(9);
      const s = (-V / cellWeight) * 1;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          let acc = 0;
          for (let k = 0; k < 3; k++) acc += stress[i * 3 + k] * invB[j * 3 + k];
          cellF[i * 3 + j] = s * acc;
        }
      }
    }

    if (!vPos || vPos.length !== 3 * n) {
      vPos = new Float64Array(3 * n);
      vCell.fill(0);
    }

    // v += F·dt/m (per-atom masses; cell block is massless)
    const masses = massesFor(structure);
    for (let i = 0; i < 3 * n; i++) vPos[i] += (F[i] * dt) / masses[(i / 3) | 0];
    if (cellF) for (let i = 0; i < 9; i++) vCell[i] += cellF[i] * dt;

    // Power: adapt along the force direction.
    let p = 0;
    for (let i = 0; i < 3 * n; i++) p += F[i] * vPos[i];
    if (cellF) for (let i = 0; i < 9; i++) p += cellF[i] * vCell[i];

    if (p > 0) {
      nSteps++;
      if (nSteps > N_MIN) {
        dt = Math.min(dt * F_INC, dtMax);
        alpha *= F_ALPHA;
      }
      let normF = 0;
      let normV = 0;
      for (let i = 0; i < 3 * n; i++) {
        normF += F[i] * F[i];
        normV += vPos[i] * vPos[i];
      }
      if (cellF) {
        for (let i = 0; i < 9; i++) {
          normF += cellF[i] * cellF[i];
          normV += vCell[i] * vCell[i];
        }
      }
      normF = Math.sqrt(normF);
      normV = Math.sqrt(normV);
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
    // Trust radius: rescale the whole step if any atom would move too far —
    // a single overshoot into close contact is what sends MLIP forces wild.
    let stepScale = 1;
    for (let i = 0; i < n; i++) {
      const dx = vPos[i * 3] * dt;
      const dy = vPos[i * 3 + 1] * dt;
      const dz = vPos[i * 3 + 2] * dt;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > maxStep) stepScale = Math.min(stepScale, maxStep / len);
    }
    const sdt = dt * stepScale;
    const newX = new Float64Array(3 * n);
    for (let i = 0; i < 3 * n; i++) newX[i] = x[i] + vPos[i] * sdt;

    const oldB = structure.lattice.basis.data;
    const newB = new Float64Array(9);
    for (let i = 0; i < 9; i++) newB[i] = oldB[i] + (cellF ? vCell[i] * sdt : 0);
    const newLattice = createLattice(newB);

    const sites = structure.sites.map((site, i) => ({
      ...site,
      frac: fractional(
        newLattice,
        new Float64Array([newX[i * 3], newX[i * 3 + 1], newX[i * 3 + 2]]),
      ),
    }));

    let maxForce = 0;
    for (let i = 0; i < 3 * n; i++) {
      maxForce = Math.max(maxForce, Math.abs(F[i]));
    }
    let maxStress: number | null = null;
    if (stress) {
      maxStress = 0;
      for (let i = 0; i < 9; i++) {
        maxStress = Math.max(maxStress, Math.abs(stress[i]));
      }
    }

    return {
      structure: { lattice: newLattice, sites },
      converged: maxForce < fmax && (maxStress === null || maxStress < smax),
      maxForce,
      maxStress,
    };
  }

  return { step, reset };
}
