/**
 * &RISM namelist parameters.
 *
 * Only used when trism=true (3D-RISM-SCF calculation).
 *
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#id9
 */
export interface QeRismOptions {
  /**
   * Number of solvent molecular species.
   */
  nsolv: number;

  /**
   * Closure equation type.
   * @default "kh"
   */
  closure?: "kh" | "hnc";

  /**
   * Solvent temperature (Kelvin).
   * @default 300
   */
  tempv?: number;

  /**
   * Kinetic energy cutoff (Ry) for solvent correlation functions.
   * @default 4 * ecutwfc
   */
  ecutsolv?: number;

  /**
   * LJ potential type for solute per atomic type.
   * @default "uff"
   */
  solute_lj?: "none" | "uff" | "clayff" | "opls-aa" | string[];

  /**
   * LJ epsilon parameter for solute per atomic type (kcal/mol).
   */
  solute_epsilon?: number[];

  /**
   * LJ sigma parameter for solute per atomic type (Angstrom).
   */
  solute_sigma?: number[];

  // --- 1D-RISM ---

  /**
   * Starting condition for 1D-RISM correlation functions.
   * @default "zero" for scf/relax/md
   */
  starting1d?: "zero" | "file" | "fix";

  /**
   * Coulomb smearing radius for 1D-RISM (a.u.).
   * @default 2
   */
  smear1d?: number;

  /**
   * Maximum iterations for 1D-RISM.
   * @default 50000
   */
  rism1d_maxstep?: number;

  /**
   * Convergence threshold for 1D-RISM.
   * @default 1e-8
   */
  rism1d_conv_thr?: number;

  /**
   * MDIIS size for 1D-RISM.
   * @default 20
   */
  mdiis1d_size?: number;

  /**
   * MDIIS step for 1D-RISM.
   * @default 0.5
   */
  mdiis1d_step?: number;

  /**
   * Gaussian width for intra-molecular correlation smearing.
   */
  rism1d_bond_width?: number;

  /**
   * Dielectric constant for 1D-RISM. >0 triggers DRISM.
   * @default -1
   */
  rism1d_dielectric?: number;

  /**
   * Solvent molecule size for DRISM (a.u.).
   * @default 2
   */
  rism1d_molesize?: number;

  /**
   * Number of processes for 1D-RISM.
   * @default 128
   */
  rism1d_nproc?: number;

  // --- 3D-RISM ---

  /**
   * Starting condition for 3D-RISM correlation functions.
   * @default "zero" for scf/relax/md, "file" for nscf/bands
   */
  starting3d?: "zero" | "file";

  /**
   * Coulomb smearing radius for 3D-RISM (a.u.).
   * @default 2
   */
  smear3d?: number;

  /**
   * Maximum iterations for 3D-RISM.
   * @default 5000
   */
  rism3d_maxstep?: number;

  /**
   * Convergence threshold for 3D-RISM.
   * @default 1e-5 (1e-5 with lgcscf=true)
   */
  rism3d_conv_thr?: number;

  /**
   * MDIIS size for 3D-RISM.
   * @default 10
   */
  mdiis3d_size?: number;

  /**
   * MDIIS step for 3D-RISM.
   * @default 0.8
   */
  mdiis3d_step?: number;

  /**
   * Convergence level for 3D-RISM (0=low, 0<x<1=medium, 1=high).
   */
  rism3d_conv_level?: number;

  /**
   * Calculate planar averages of solvent densities.
   * @default false for 3D-RISM, true for Laue-RISM
   */
  rism3d_planar_average?: boolean;

  // --- Laue-RISM ---

  /**
   * Number of z-grid points for polynomial fit along cell edge.
   * @default 4
   */
  laue_nfit?: number;

  /**
   * Ending position offset of right solvent region (a.u.).
   * @default -1 (auto)
   */
  laue_expand_right?: number;

  /**
   * Ending position offset of left solvent region (a.u.).
   * @default -1 (auto)
   */
  laue_expand_left?: number;

  /**
   * Starting position of right solvent region (a.u.).
   * @default 0
   */
  laue_starting_right?: number;

  /**
   * Starting position of left solvent region (a.u.).
   * @default 0
   */
  laue_starting_left?: number;

  /**
   * Buffering length of right solvent region (a.u.).
   * @default 8 if laue_expand_right > 0, else -1
   */
  laue_buffer_right?: number;

  /**
   * Buffering length of left solvent region (a.u.).
   * @default 8 if laue_expand_left > 0, else -1
   */
  laue_buffer_left?: number;

  /**
   * Allow different densities on left and right solvent regions.
   * @default false
   */
  laue_both_hands?: boolean;

  /**
   * Repulsive wall type for Laue-RISM.
   * @default "auto"
   */
  laue_wall?: "none" | "auto" | "manual";

  /**
   * Edge position of repulsive wall (a.u., laue_wall='manual').
   * @default 0
   */
  laue_wall_z?: number;

  /**
   * Density of repulsive wall (1/bohr^3).
   * @default 0.01
   */
  laue_wall_rho?: number;

  /**
   * LJ epsilon of repulsive wall (kcal/mol).
   * @default 0.1
   */
  laue_wall_epsilon?: number;

  /**
   * LJ sigma of repulsive wall (Angstrom).
   * @default 4
   */
  laue_wall_sigma?: number;

  /**
   * Add attractive -(1/r)^6 term to wall LJ potential.
   * @default false
   */
  laue_wall_lj6?: boolean;
}
