/**
 * &ELECTRONS namelist parameters.
 *
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#id5
 */
export interface QeElectronsOptions {
  /**
   * Maximum number of SCF iterations.
   * @default 100
   */
  electron_maxstep?: number;

  /**
   * Maximum number of outer iterations for exact exchange.
   * @default 100
   */
  exx_maxstep?: number;

  /**
   * If false, do not stop MD/relax when electron_maxstep is reached.
   * @default true
   */
  scf_must_converge?: boolean;

  /**
   * Convergence threshold for selfconsistency (estimated energy error, Ry).
   * @default 1e-6
   */
  conv_thr?: number;

  /**
   * Use adaptive conv_thr for inner SCF loops (EXX).
   * @default false
   */
  adaptive_thr?: boolean;

  /**
   * Convergence threshold for first SCF cycle when adaptive_thr=true.
   * @default 1e-3
   */
  conv_thr_init?: number;

  /**
   * Convergence threshold multiplier: max(conv_thr, conv_thr_multi * dexx).
   * @default 1e-1
   */
  conv_thr_multi?: number;

  /**
   * Charge density mixing method.
   * @default "plain"
   */
  mixing_mode?: "plain" | "TF" | "local-TF";

  /**
   * Mixing factor for selfconsistency.
   * @default 0.7
   */
  mixing_beta?: number;

  /**
   * Number of iterations in mixing scheme.
   * @default 8
   */
  mixing_ndim?: number;

  /**
   * Number of iterations with fixed ns (DFT+U).
   * @default 0
   */
  mixing_fixed_ns?: number;

  /**
   * Iterative diagonalization method.
   * @default "david"
   */
  diagonalization?:
    | "david"
    | "cg"
    | "ppcg"
    | "paro"
    | "ParO"
    | "rmm-davidson"
    | "rmm-paro";

  /**
   * Initial convergence threshold (ethr) for iterative diagonalization.
   * SCF: 1e-2 from atomic orbitals, 1e-5 from charge density.
   * NSCF: (conv_thr / N_elec) / 10.
   */
  diago_thr_init?: number;

  /**
   * Max iterations for conjugate-gradient diagonalization.
   */
  diago_cg_maxiter?: number;

  /**
   * Davidson workspace dimension (number of wavefunction packets).
   * @default 2
   */
  diago_david_ndim?: number;

  /**
   * RMM-DIIS workspace dimension.
   * @default 4
   */
  diago_rmm_ndim?: number;

  /**
   * If true, RMM-DIIS is performed until convergence.
   * @default false
   */
  diago_rmm_conv?: boolean;

  /**
   * RMM-DIIS blocking size for Gram-Schmidt orthogonalization.
   * @default 16
   */
  diago_gs_nblock?: number;

  /**
   * If true, empty states diagonalized at same accuracy as occupied.
   * @default false
   */
  diago_full_acc?: boolean;

  /**
   * Amplitude of finite electric field (Ry a.u., lelfield=true, non-automatic k-points).
   * @default 0
   */
  efield?: number;

  /**
   * Finite electric field in Cartesian coordinates (Ry a.u., lelfield=true, automatic k-points).
   * @default [0, 0, 0]
   */
  efield_cart?: [number, number, number];

  /**
   * Phase for electronic polarization.
   * @default "none"
   */
  efield_phase?: "read" | "write" | "none";

  /**
   * Starting potential source.
   * @default "atomic" for scf/relax/md, "file" for nscf/bands
   */
  startingpot?: "atomic" | "file";

  /**
   * Starting wavefunctions source.
   * @default "atomic+random"
   */
  startingwfc?: "atomic" | "atomic+random" | "random" | "file";

  /**
   * Use real-space algorithm for augmentation charges (US-PP/PAW).
   * @default false
   */
  tqr?: boolean;

  /**
   * Use real-space localization for nonlocal projectors.
   * @default false
   */
  real_space?: boolean;
}
