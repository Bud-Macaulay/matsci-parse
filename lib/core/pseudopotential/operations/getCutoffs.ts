import type { Pseudopotential } from "../pseudopotential";

/** Cutoff radii per projector (Bohr), plus header-suggested plane-wave cutoffs (Ry). */
export interface CutoffInfo {
  /** Per-projector cutoff radius (cutoffRadius ?? ultrasoftCutoffRadius). */
  projectorCutoffs: Array<{ l: number; label: string; cutoff: number }>;
  /** Suggested wavefunction cutoff from the header (Ry). */
  wfcCutoff: number;
  /** Suggested charge-density cutoff from the header (Ry). */
  rhoCutoff: number;
}

/**
 * Collect cutoff radii and suggested plane-wave cutoffs.
 *
 * @param pp - The pseudopotential to inspect.
 */
export function getCutoffs(pp: Pseudopotential): CutoffInfo {
  return {
    projectorCutoffs: pp.nonlocal.betas.map((beta) => ({
      l: beta.angularMomentum,
      label: beta.label,
      cutoff: beta.cutoffRadius ?? beta.ultrasoftCutoffRadius,
    })),
    wfcCutoff: pp.header.wfcCutoff,
    rhoCutoff: pp.header.rhoCutoff,
  };
}
