import { birchMurnaghan } from "./birchMurnaghan";
import { murnaghan } from "./murnaghan";
import { vinet } from "./vinet";
import { poirierTarantola } from "./poirierTarantola";

/** Parameters of a four-parameter equation of state. */
export interface EosParameters {
  /** Equilibrium energy E₀ (eV, same normalisation as the fitted energies). */
  e0: number;
  /** Equilibrium volume V₀ (Å³). */
  v0: number;
  /** Bulk modulus B₀ at V₀ (eV/Å³; multiply by 160.21766208 for GPa). */
  b0: number;
  /** Pressure derivative of the bulk modulus B₀′ = dB/dP at V₀ (dimensionless). */
  b1: number;
}

/** An analytic E(V) equation of state and its pressure P = −dE/dV. */
export interface EosModel {
  /** Identifier, as accepted by fitEos. */
  readonly name: EosName;
  /** E(V) in eV for V in Å³. */
  energy(volume: number, p: EosParameters): number;
  /** P(V) = −dE/dV in eV/Å³ (positive = compressed) for V in Å³. */
  pressure(volume: number, p: EosParameters): number;
}

/** Names of the supported equations of state (the four-parameter forms
 * shared by ASE's EquationOfState and pymatgen's EOS). */
export type EosName =
  | "birchMurnaghan"
  | "murnaghan"
  | "vinet"
  | "poirierTarantola";

export { birchMurnaghan, murnaghan, vinet, poirierTarantola };

/** All supported equations of state, keyed by name. */
export const eosModels: Readonly<Record<EosName, EosModel>> = {
  birchMurnaghan,
  murnaghan,
  vinet,
  poirierTarantola,
};
