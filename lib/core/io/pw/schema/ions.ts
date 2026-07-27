/**
 * &IONS namelist parameters.
 *
 * Required when calculation='relax'|'md'|'vc-relax'|'vc-md'.
 * Optional for scf (only ion_positions is used).
 *
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#id6
 */
export interface QeIonsOptions {
  /**
   * How to handle initial atomic positions.
   * @default "default"
   */
  ion_positions?: "default" | "from_input";

  /**
   * How to handle initial ionic velocities.
   * @default "default"
   */
  ion_velocities?: "default" | "from_input";

  /**
   * Type of ionic dynamics. Default depends on calculation type.
   */
  ion_dynamics?:
    | "bfgs"
    | "damp"
    | "fire"
    | "verlet"
    | "velocity-verlet"
    | "langevin"
    | "langevin-smc"
    | "beeman";

  /**
   * Potential extrapolation method from preceding ionic steps.
   * @default "atomic"
   */
  pot_extrapolation?: "none" | "atomic" | "first_order" | "second_order";

  /**
   * Wavefunction extrapolation method from preceding ionic steps.
   * @default "none"
   */
  wfc_extrapolation?: "none" | "first_order" | "second_order";

  /**
   * Remove rigid rotation for isolated systems.
   * @default false
   */
  remove_rigid_rot?: boolean;

  // --- MD thermostat ---

  /**
   * Ionic temperature control method.
   * @default "not_controlled"
   */
  ion_temperature?:
    | "rescaling"
    | "rescale-v"
    | "rescale-T"
    | "reduce-T"
    | "nose"
    | "berendsen"
    | "andersen"
    | "svr"
    | "initial"
    | "not_controlled";

  /**
   * Starting/target temperature for thermostats (Kelvin).
   * @default 300
   */
  tempw?: number;

  /**
   * Nose thermostat oscillation frequency (THz). 3 THz ≈ 100 cm⁻¹.
   * @default 1
   */
  fnosep?: number;

  /**
   * Number of thermostats in Nose-Hoover chain (max 4).
   * @default 1
   */
  nhpcl?: number;

  /**
   * Type of massive Nose-Hoover chain: 0=all atoms, 1=per type, 2=per atom, 3=custom.
   * @default 0
   */
  nhptyp?: number;

  /**
   * Thermostat group assignment per atomic type (nhptyp=3).
   * @default 0
   */
  nhgrp?: number[];

  /**
   * Scaling factors per atomic type for constraints (nhptyp=3).
   * @default (Nat_total - 1) / Nat_total
   */
  fnhscl?: number[];

  /**
   * Degrees of freedom for temperature calculation. <=0 means 3*nat + ndega.
   * @default 0
   */
  ndega?: number;

  /**
   * Tolerance for velocity rescaling.
   * @default 100
   */
  tolp?: number;

  /**
   * Temperature scaling factor (rescale-T) or increment (reduce-T).
   * @default 1
   */
  delta_t?: number;

  /**
   * Rescaling/collision frequency parameter.
   * @default 1
   */
  nraise?: number;

  /**
   * Refold ions into supercell at each step.
   * @default false
   */
  refold_pos?: boolean;

  // --- BFGS ---

  /**
   * Max reduction factor for conv_thr during relaxation.
   * @default 100
   */
  upscale?: number;

  /**
   * Number of old vectors in PULAY mixing (1 = standard BFGS).
   * @default 1
   */
  bfgs_ndim?: number;

  /**
   * Use full GDIIS step instead of BFGS trust radius.
   * @default true
   */
  tgdiis_step?: boolean;

  /**
   * Maximum ionic displacement (BFGS).
   * @default 0.8
   */
  trust_radius_max?: number;

  /**
   * Minimum ionic displacement; BFGS reset below this (BFGS).
   * @default 1e-3
   */
  trust_radius_min?: number;

  /**
   * Initial ionic displacement (BFGS).
   * @default 0.5
   */
  trust_radius_ini?: number;

  /**
   * Wolfe condition parameter w1 (BFGS).
   * @default 0.01
   */
  w_1?: number;

  /**
   * Wolfe condition parameter w2 (BFGS).
   * @default 0.5
   */
  w_2?: number;

  // --- FIRE ---

  /**
   * Initial alpha mixing factor for FIRE.
   * @default 0.2
   */
  fire_alpha_init?: number;

  /**
   * Alpha scaling factor for steps with P > 0 (FIRE).
   * @default 0.99
   */
  fire_falpha?: number;

  /**
   * Minimum steps with P > 0 before increasing dt (FIRE).
   * @default 5
   */
  fire_nmin?: number;

  /**
   * Factor for increasing dt (FIRE).
   * @default 1.1
   */
  fire_f_inc?: number;

  /**
   * Factor for decreasing dt (FIRE).
   * @default 0.5
   */
  fire_f_dec?: number;

  /**
   * Maximum dt in FIRE (actual max = fire_dtmax * dt).
   * @default 10
   */
  fire_dtmax?: number;
}
