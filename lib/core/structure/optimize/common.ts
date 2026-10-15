import { determinant } from "@/core/matrix/operations/determinant";
import { inverse3x3 } from "@/core/matrix/operations/inverse/inverse3x3";
import { createMatrix, type Matrix } from "@/core/matrix/matrix";
import { mul } from "@/core/matrix/operations/mul";
import { negate } from "@/core/matrix/operations/negate";
import { sub } from "@/core/matrix/operations/sub";
import { scale as scaleMatrix } from "@/core/matrix/operations/scale";
import { transpose } from "@/core/matrix/operations/transpose";
import { norm } from "@/core/matrix/operations/vector/norm";
import type { Structure } from "../structure";
import { applyStrain } from "../operations/applyStrain";

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

/** Optimizer coordinates. Positions are x̃ = f·B_ref: fractional coords
 * mapped through a fixed reference cell, so holding x̃ fixed holds f fixed
 * and a cell step carries the atoms along affinely. That is the derivative
 * the stress describes, so (x̃, B) is a consistent coordinate system. With
 * stress, the 9 row-major basis components B follow the 3n positions.
 *
 * Gradient: x = x̃·M with M = B_ref⁻¹·B (rows are lattice vectors), so
 * ∂E/∂x̃ = -F·Mᵀ (F as an n×3 matrix); ∂E/∂B = V·B⁻ᵀ·σ (see
 * cellGeneralizedForces). Without stress pass refB = current basis: M = I
 * and x̃ is Cartesian. Throws on bad input shapes instead of propagating
 * NaNs. */
export function assemble(
  structure: Structure,
  forces: Float64Array,
  stress: Float64Array | undefined,
  refB: Matrix,
): { x: Float64Array; g: Float64Array; invB: Matrix | null } {
  const n = structure.sites.length;
  if (forces.length !== 3 * n) {
    throw new Error(`Expected forces length ${3 * n}, got ${forces.length}`);
  }
  if (stress && stress.length !== 9) {
    throw new Error(`Expected stress length 9, got ${stress.length}`);
  }
  const basis = structure.lattice.basis;
  const fracs = createMatrix(
    n,
    3,
    structure.sites.flatMap((site) => [site.frac[0], site.frac[1], site.frac[2]]),
  );
  const M = mul(inverse3x3(refB), basis);
  const gPos = negate(mul(createMatrix(n, 3, forces), transpose(M)));

  const x = new Float64Array(3 * n + (stress ? 9 : 0));
  const g = new Float64Array(x.length);
  x.set(mul(fracs, refB).data);
  g.set(gPos.data);

  let invB: Matrix | null = null;
  if (stress) {
    const { cellF, inv } = cellGeneralizedForces(basis, stress);
    invB = inv;
    x.set(basis.data, 3 * n);
    g.set(negate(cellF).data, 3 * n);
  }
  return { x, g, invB };
}

/** Structure at optimizer coordinates: move the atoms to fractional
 * coords f = x̃·B_ref⁻¹ (see {@link assemble}), then strain the cell from
 * its current basis B onto newB. The cell step dB = newB - B is the strain
 * ε = (B⁻¹·dB)ᵀ, since B·(I + ε)ᵀ = B + dB (see {@link cellGeneralizedForces}). */
export function rebuild(
  structure: Structure,
  newX: Float64Array,
  newB: Float64Array,
  refB: Matrix,
): Structure {
  const n = structure.sites.length;
  const fracs = mul(
    createMatrix(n, 3, newX.subarray(0, 3 * n)),
    inverse3x3(refB),
  ).data;
  const sites = structure.sites.map((site, i) => ({
    ...site,
    frac: fracs.slice(i * 3, i * 3 + 3),
  }));
  const B = structure.lattice.basis;
  const strain = transpose(
    mul(inverse3x3(B), sub(createMatrix(3, 3, newB), B)),
  );
  return applyStrain({ lattice: structure.lattice, sites }, strain);
}

/** Cell generalized forces F_B = -∂E/∂B = -V·B⁻ᵀ·σ, plus B⁻¹.
 *
 * Rows of B are lattice vectors (r = f·B). A strain r' = (I+ε)·r gives
 * dB = B·εᵀ, and dE = V·σ:ε, so ∂E/∂B = V·B⁻ᵀ·σ (σ symmetric). */
export function cellGeneralizedForces(
  basis: Matrix,
  stress: Float64Array,
): { cellF: Matrix; inv: Matrix } {
  const V = Math.abs(determinant(basis));
  const inv = inverse3x3(basis);
  const cellF = scaleMatrix(mul(transpose(inv), createMatrix(3, 3, stress)), -V);
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
  for (let i = 0; i < v.length; i += 3) {
    const len = norm(v.subarray(i, i + 3)) * Math.abs(dt);
    if (len > maxStep) s = Math.min(s, maxStep / len);
  }
  return s;
}

/** Scale for a cell rate vCell moved by dt so max |strain| <= maxCellStrain.
 * Strain of dB is B⁻¹·dB (= εᵀ for rows-as-lattice-vectors). */
export function cellScale(
  vCell: Float64Array,
  dt: number,
  invB: Matrix,
  maxCellStrain: number,
): number {
  const strain = mul(invB, createMatrix(3, 3, vCell)).data;
  let trial = 0;
  for (const e of strain) trial = Math.max(trial, Math.abs(e * dt));
  return trial > maxCellStrain ? maxCellStrain / trial : 1;
}

/** Revert newB onto oldB when the volume is non-positive/non-finite. */
export function ensurePositiveVolume(
  newB: Float64Array,
  oldB: Float64Array,
): boolean {
  const det = determinant(createMatrix(3, 3, newB));
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
