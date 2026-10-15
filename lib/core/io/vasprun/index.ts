import type { KPointSet } from "../../kpoints";
import type { Structure } from "../../structure/structure";
import {
  parseVasprun,
  type VasprunIonicStep,
  type VasprunOptions,
  type VasprunValue,
} from "./parse";

export type { VasprunOptions, VasprunValue } from "./parse";

/** A VASP run read from vasprun.xml. Units: eV, Å, eV/Å, eV/Å³. */
export interface VasprunResult {
  initialStructure: Structure;
  finalStructure: Structure;
  /** One structure per ionic step (relaxation or MD trajectory). */
  structures: Structure[];
  /**
   * Total energy per ionic step in eV, extrapolated to zero smearing (as
   * pymatgen's `final_energy`, including its fix for VASP versions that
   * write a wrong value).
   */
  energies: number[];
  /** Forces per ionic step in eV/Å, [step][site][xyz]; null where not written. */
  forces: (number[][] | null)[];
  /**
   * Stress per ionic step in eV/Å³ with the physical sign convention
   * (positive = tensile); null where not written.
   */
  stresses: (number[][] | null)[];
  /**
   * electronic: the final ionic step's SCF converged (fewer than NELM steps).
   * ionic: the relaxation stopped before NSW steps (for MD, or EDIFFG = 0:
   * it completed NSW steps). Same rules as pymatgen.
   */
  converged: { electronic: boolean; ionic: boolean };
  /** The k-points VASP used, with weights (reciprocal coordinates). */
  kpoints: KPointSet;
  /** Fermi energy in eV; null if not written. */
  efermi: number | null;
  /** Band energies and occupations, [spin][kpoint][band]; null if absent or skipped. */
  bands: { energies: number[][][]; occupations: number[][][] } | null;
  /** Total density of states, densities [spin][point] in states/eV; null if absent or skipped. */
  dos: { energies: number[]; densities: number[][] } | null;
  /** INCAR tags as given by the user. */
  incar: Record<string, VasprunValue>;
}

/**
 * The energy pymatgen reports: e_0_energy (σ → 0), unless VASP wrote it
 * wrongly in the ionic-step summary, in which case it is rebuilt from the
 * last SCF step: (e_0 - e_fr)_last SCF + e_fr.
 * See https://www.vasp.at/forum/viewtopic.php?f=3&t=16942
 */
function stepEnergy(step: VasprunIonicStep): number {
  const { sigma0, free } = step.energy;
  const last = step.lastElectronic;
  if (!last) return sigma0;
  const fixed = Math.round((last.sigma0 - last.free + free) * 1e8) / 1e8;
  return Math.abs(sigma0 - fixed) > 1e-7 ? fixed : sigma0;
}

/**
 * Read a VASP vasprun.xml: the structures and energies/forces/stress of
 * every ionic step, convergence, the k-points, and the band energies,
 * Fermi energy and total DOS.
 *
 * Projected DOS, projected eigenvalues and dielectric/DFPT data are not
 * read.
 *
 * @param text - Contents of vasprun.xml.
 * @param opts - Skip band energies and/or the DOS to save memory on large files.
 * @returns The run.
 */
export function fromVasprun(
  text: string,
  opts: VasprunOptions = {},
): VasprunResult {
  const run = parseVasprun(text, opts);
  const steps = run.ionicSteps;
  return {
    initialStructure: run.initialStructure,
    finalStructure: run.finalStructure,
    structures: steps.map((s) => s.structure),
    energies: steps.map(stepEnergy),
    forces: steps.map((s) => s.forces),
    stresses: steps.map((s) => s.stress),
    converged: run.converged,
    kpoints: {
      kind: "points",
      points: run.kpoints.kpoints.map(([a, b, c]) => ({
        coordinate: [a!, b!, c!] as const,
      })),
      weights: run.kpoints.weights,
      coordinateSystem: "reciprocal",
    },
    efermi: run.efermi,
    bands: run.eigenvalues,
    dos: run.dos && { energies: run.dos.energies, densities: run.dos.total },
    incar: run.incar,
  };
}
