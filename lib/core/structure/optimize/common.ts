import { determinant } from "@/core/matrix/operations/determinant";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import type { Matrix } from "@/core/matrix/matrix";
import { cartesian } from "@/core/site/cartesian";
import type { Structure } from "../structure";

/** Shared options for all force-based optimizers. */
export interface OptimizerOptions {
  /** Convergence: max Cartesian force component. Default 0.05. */
  fmax?: number;
  /** Convergence: max stress component (only when stress is given). Default 0.01. */
  smax?: number;
  /** max Cartesian displacement per atom per step (Å). Default 0.2. */
  maxStep?: number;
  /** Max cell strain per step (max |dB·B⁻¹| component). Default 0.02. */
  maxCellStrain?: number;
}

export interface OptStep {
  structure: Structure;
  converged: boolean;
  maxForce: number;
  maxStress: number | null;
}

/** A force-based optimizer: external loop feeds forces, gets back the next
 * structure. `stress` (full 3x3, eV/Å³, positive = tensile) enables cell
 * relaxation; omit it for positions-only. */
export interface Optimizer {
  step(
    structure: Structure,
    forces: Float64Array,
    stress?: Float64Array,
  ): OptStep;
  reset(): void;
}

export function hasConverged(
  maxForce: number,
  maxStress: number | null,
  fmax: number,
  smax: number,
): boolean {
  return maxForce < fmax && (maxStress === null || maxStress < smax);
}

export function dot(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Poor-man's trust region for line-search-free QN methods: the step
 * scale recovers toward 1 on steps that reduce |g| and halves on steps
 * that don't. Without this, unit steps ping-pong across the minimum
 * inside the strain/displacement caps forever. */
export function adaptScale(
  scale: number,
  gNorm: number,
  prevGNorm: number,
): number {
  if (!(gNorm > prevGNorm)) return Math.min(1, scale * 1.1);
  return Math.max(1e-4, scale * 0.5);
}

/** Flat Cartesian positions, gradient g = -[forces, cellF], and B⁻¹.
 * Throws on bad input shapes instead of propagating NaNs. */
export function assemble(
  structure: Structure,
  forces: Float64Array,
  stress?: Float64Array,
): { x: Float64Array; g: Float64Array; invB: Float64Array | null } {
  const n = structure.sites.length;
  if (forces.length !== 3 * n) {
    throw new Error(`Expected forces length ${3 * n}, got ${forces.length}`);
  }
  if (stress && stress.length !== 9) {
    throw new Error(`Expected stress length 9, got ${stress.length}`);
  }
  const x = new Float64Array(3 * n + (stress ? 9 : 0));
  for (let i = 0; i < n; i++) {
    const c = cartesian(structure.lattice, structure.sites[i]);
    x[i * 3] = c[0];
    x[i * 3 + 1] = c[1];
    x[i * 3 + 2] = c[2];
  }
  const g = new Float64Array(x.length);
  for (let i = 0; i < 3 * n; i++) g[i] = -forces[i];
  let invB: Float64Array | null = null;
  if (stress) {
    const { cellF, inv } = cellGeneralizedForces(
      structure.lattice.basis,
      stress,
    );
    invB = inv;
    for (let i = 0; i < 9; i++) g[3 * n + i] = -cellF[i];
  }
  return { x, g, invB };
}

/** Cell generalized forces F_B = -V·σ·B⁻ᵀ plus row-major B⁻¹. */
export function cellGeneralizedForces(
  basis: Matrix,
  stress: Float64Array,
): { cellF: Float64Array; inv: Float64Array } {
  const V = Math.abs(determinant(basis));
  const inv = inverse3x3(basis).data;
  const cellF = new Float64Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let acc = 0;
      for (let k = 0; k < 3; k++) acc += stress[i * 3 + k] * inv[j * 3 + k];
      cellF[i * 3 + j] = -V * acc;
    }
  }
  return { cellF, inv };
}

/** Scale for a displacement-rate v moved by dt so no atom moves more
 * than maxStep. Pass dt = 1 when v already is a displacement. */
export function atomScale(
  v: Float64Array,
  dt: number,
  maxStep: number,
): number {
  let s = 1;
  for (let i = 0; i < v.length / 3; i++) {
    const dx = v[i * 3] * dt;
    const dy = v[i * 3 + 1] * dt;
    const dz = v[i * 3 + 2] * dt;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > maxStep) s = Math.min(s, maxStep / len);
  }
  return s;
}

/** Scale for a cell rate vCell moved by dt so max |strain| <= maxCellStrain. */
export function cellScale(
  vCell: Float64Array,
  dt: number,
  invB: Float64Array,
  maxCellStrain: number,
): number {
  let trial = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let e = 0;
      for (let k = 0; k < 3; k++) e += vCell[i * 3 + k] * dt * invB[k * 3 + j];
      const a = Math.abs(e);
      if (a > trial) trial = a;
    }
  }
  return trial > maxCellStrain ? maxCellStrain / trial : 1;
}

/** Revert newB onto oldB when the volume is non-positive/non-finite. */
export function ensurePositiveVolume(
  newB: Float64Array,
  oldB: Float64Array,
): boolean {
  const det =
    newB[0] * (newB[4] * newB[8] - newB[5] * newB[7]) -
    newB[1] * (newB[3] * newB[8] - newB[5] * newB[6]) +
    newB[2] * (newB[3] * newB[7] - newB[4] * newB[6]);
  if (!Number.isFinite(det) || det <= 0) {
    newB.set(oldB);
    return false;
  }
  return true;
}

export function forceSummary(
  forces: Float64Array,
  stress?: Float64Array,
): { maxForce: number; maxStress: number | null } {
  let maxForce = 0;
  for (let i = 0; i < forces.length; i++) {
    maxForce = Math.max(maxForce, Math.abs(forces[i]));
  }
  let maxStress: number | null = null;
  if (stress) {
    maxStress = 0;
    for (let i = 0; i < 9; i++) {
      maxStress = Math.max(maxStress, Math.abs(stress[i]));
    }
  }
  return { maxForce, maxStress };
}
