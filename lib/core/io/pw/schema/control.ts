/**
 * &CONTROL namelist parameters.
 *
 * All optional fields include their QE default value in the JSDoc.
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#id3
 */
export interface QeControlOptions {
  /**
   * Task to be performed.
   * @default "scf"
   */
  calculation?:
    | "scf"
    | "nscf"
    | "bands"
    | "relax"
    | "md"
    | "vc-relax"
    | "vc-md";

  /**
   * Description printed on output.
   * @default ""
   */
  title?: string;

  /**
   * Verbosity level of output.
   * @default "low"
   */
  verbosity?: "high" | "low" | "debug" | "medium" | "default" | "minimal";

  /**
   * Start from scratch or restart a previous run.
   * @default "from_scratch"
   */
  restart_mode?: "from_scratch" | "restart";

  /**
   * Number of MD / ionic optimization steps.
   * 1 for scf/nscf/bands, 50 otherwise.
   * @default undefined (context-dependent)
   */
  nstep?: number;

  /**
   * Write trajectory every iprint MD steps.
   * @default undefined (write only at convergence)
   */
  iprint?: number;

  /**
   * Calculate stress tensor.
   * @default false
   */
  tstress?: boolean;

  /**
   * Calculate forces on atoms.
   * Set to true automatically for relax/md/vc-md.
   * @default false
   */
  tprnfor?: boolean;

  /**
   * MD time step in Rydberg atomic units (1 a.u. = 4.8378e-17 s).
   * @default 20.0
   */
  dt?: number;

  /**
   * Directory for input/temp/output files.
   * @default value of ESPRESSO_TMPDIR env var, or "./"
   */
  outdir?: string;

  /**
   * Directory for per-processor wavefunction files (*.wfc{N}, *.igk{N}).
   * @default same as outdir
   */
  wfcdir?: string;

  /**
   * Prefix prepended to output filenames (prefix.wfc, prefix.rho, etc.).
   * @default "pwscf"
   */
  prefix?: string;

  /**
   * Max CPU time in seconds. Job stops after this limit.
   * @default 1e7 (~150 days)
   */
  max_seconds?: number;

  /**
   * Convergence threshold on total energy (Ry) for ionic minimization.
   * @default 1e-4
   */
  etot_conv_thr?: number;

  /**
   * Convergence threshold on forces (Ry/bohr) for ionic minimization.
   * @default 1e-3
   */
  forc_conv_thr?: number;

  /**
   * Disk I/O amount.
   * - "high": save charge at each SCF step, keep wfc on disk
   * - "medium": save charge at each SCF step, keep wfc on disk only if >1 k-point per process
   * - "low": save charge at each SCF step, keep wfc in memory
   * - "nowf": save only xml + charge at convergence, never save wfc
   * - "minimal": save only xml at convergence
   * - "none": save nothing to disk
   *
   * @default "low" for scf, "medium" otherwise
   */
  disk_io?: "high" | "medium" | "low" | "nowf" | "minimal" | "none";

  /**
   * Directory containing pseudopotential files.
   * @default value of ESPRESSO_PSEUDO env var, or "$HOME/espresso/pseudo/"
   */
  pseudo_dir?: string;

  /**
   * Apply saw-like electric field potential.
   * @default false
   */
  tefield?: boolean;

  /**
   * Apply dipole correction (requires tefield=true). For slab geometry.
   * @default false
   */
  dipfield?: boolean;

  /**
   * Apply homogeneous electric field via modern polarization theory.
   * Different from tefield.
   * @default false
   */
  lelfield?: boolean;

  /**
   * Number of iterations for wfc convergence in electric field Hamiltonian.
   * @default 1
   */
  nberrycyc?: number;

  /**
   * Perform orbital magnetization calculation. Requires nscf on uniform k-grid.
   * @default false
   */
  lorbm?: boolean;

  /**
   * Perform Berry phase calculation.
   * @default false
   */
  lberry?: boolean;

  /**
   * Direction of k-point strings for Berry phase (1, 2, or 3).
   * Also direction of field if lelfield=true.
   * Required when lberry=true or lelfield=true.
   */
  gdir?: 1 | 2 | 3;

  /**
   * Number of k-points along each symmetry-reduced string.
   * Required when lberry=true or lelfield=true.
   */
  nppstr?: number;

  /**
   * Use charged plate instead of background for charged cells.
   * @default false
   */
  gate?: boolean;

  /**
   * Two chemical potential calculation for photoexcited systems.
   * Requires occupations='smearing'.
   * @default false
   */
  twochem?: boolean;

  /**
   * Constant bias potential (constant-mu) calculation with ESM.
   * @default false
   */
  lfcp?: boolean;

  /**
   * 3D-RISM-SCF calculation.
   * @default false
   */
  trism?: boolean;
}
