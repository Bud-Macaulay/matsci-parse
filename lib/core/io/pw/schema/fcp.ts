/**
 * &FCP namelist parameters.
 *
 * Only used when lfcp=true (constant bias potential / constant-mu).
 *
 * @see https://www.quantum-espresso.org/Doc/INPUT_PW.html#id8
 */
export interface QeFcpOptions {
  /**
   * Target Fermi energy (eV).
   */
  fcp_mu: number;

  /**
   * FCP dynamics type. Default depends on calculation type.
   */
  fcp_dynamics?:
    | "bfgs"
    | "newton"
    | "damp"
    | "lm"
    | "velocity-verlet"
    | "verlet";

  /**
   * Convergence threshold on force (eV) for FCP relaxation.
   * @default 1e-2
   */
  fcp_conv_thr?: number;

  /**
   * DIIS size for FCP relaxation (fcp_dynamics='newton' only).
   * @default 4
   */
  fcp_ndiis?: number;

  /**
   * FCP mass.
   * @default 5e+6 / (xy area) for ESM, 5e+4 / (xy area) for ESM-RISM
   */
  fcp_mass?: number;

  /**
   * Initial FCP velocity.
   * @default determined by fcp_temperature
   */
  fcp_velocity?: number;

  /**
   * FCP temperature control method.
   * @default same as ion_temperature
   */
  fcp_temperature?:
    | "rescaling"
    | "rescale-v"
    | "rescale-T"
    | "reduce-T"
    | "berendsen"
    | "andersen"
    | "initial"
    | "not_controlled";

  /**
   * FCP starting/target temperature (Kelvin).
   * @default same as tempw
   */
  fcp_tempw?: number;

  /**
   * FCP tolerance for velocity rescaling.
   * @default same as tolp
   */
  fcp_tolp?: number;

  /**
   * FCP temperature scaling factor (rescale-T) or increment (reduce-T).
   * @default same as delta_t
   */
  fcp_delta_t?: number;

  /**
   * FCP rescaling/collision frequency parameter.
   * @default same as nraise
   */
  fcp_nraise?: number;

  /**
   * Freeze all atoms; perform only FCP dynamics.
   * @default false
   */
  freeze_all_atoms?: boolean;
}
