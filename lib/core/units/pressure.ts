import { convertMeasurement, convertMeasurementArray } from "./converter";

/** Supported pressure / stress / elastic-modulus unit identifiers. */
export type PressureUnits =
  | "GPa"
  | "eV/Å³"
  | "kbar"
  | "bar"
  | "MPa"
  | "Pa"
  | "Mbar"
  | "atm";

/** 1 eV/Å³ in GPa (CODATA 2014 elementary charge, the value ASE and
 * pymatgen use; also used by the vasprun parser). */
export const EV_PER_A3_TO_GPA = 160.21766208;

const PressureConversions: Record<PressureUnits, number> = {
  GPa: 1,
  "eV/Å³": EV_PER_A3_TO_GPA,
  kbar: 0.1,
  bar: 1e-4,
  MPa: 1e-3,
  Pa: 1e-9,
  Mbar: 100,
  atm: 1.01325e-4,
};

const PressureAliases: Record<string, PressureUnits> = {
  "eV/A^3": "eV/Å³",
  "eV/A3": "eV/Å³",
  "eV/Ang^3": "eV/Å³",
  kBar: "kbar",
  kB: "kbar",
  gpa: "GPa",
};

/** Unit system for pressure, stress and elastic moduli with GPa as base. */
export const PressureUnitSystem = {
  conversions: PressureConversions,
  aliases: PressureAliases,

  convert(
    value: number,
    from: PressureUnits | string,
    to: PressureUnits | string,
  ) {
    return convertMeasurement(
      value,
      from as PressureUnits,
      to as PressureUnits,
      PressureConversions,
      PressureAliases,
    );
  },

  convertArray(
    arr: number[],
    from: PressureUnits | string,
    to: PressureUnits | string,
  ) {
    return convertMeasurementArray(
      arr,
      from as PressureUnits,
      to as PressureUnits,
      PressureConversions,
      PressureAliases,
    );
  },
};
