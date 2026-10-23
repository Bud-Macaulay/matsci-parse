import { convertMeasurement, convertMeasurementArray } from "./converter";

/**
 * Supported frequency unit identifiers. Energies (meV, eV, Hartree, Rydberg)
 * are the photon/phonon energy E = hν.
 */
export type FrequencyUnits = "cm-1" | "THz" | "meV" | "eV" | "Hartree" | "Rydberg";

/**
 * Factors to cm⁻¹, from the exact SI values of c, h and e (CODATA 2018) and
 * the CODATA 2018 Hartree/Rydberg energies in cm⁻¹.
 */
const FrequencyConversions: Record<FrequencyUnits, number> = {
  "cm-1": 1,
  THz: 33.3564095198152,
  meV: 8.065543937349211,
  eV: 8065.543937349211,
  Hartree: 219474.6313632,
  Rydberg: 109737.3156816,
};

const FrequencyAliases: Record<string, FrequencyUnits> = {
  "cm^-1": "cm-1",
  "cm⁻¹": "cm-1",
  "1/cm": "cm-1",
  cm1: "cm-1",
  thz: "THz",
  mev: "meV",
  ev: "eV",
  Ha: "Hartree",
  Ry: "Rydberg",
};

/**
 * Unit system for frequency conversions with cm⁻¹ as base. Conversions are
 * linear, so negative (imaginary) frequencies keep their sign.
 */
export const FrequencyUnitSystem = {
  conversions: FrequencyConversions,
  aliases: FrequencyAliases,

  convert(
    value: number,
    from: FrequencyUnits | string,
    to: FrequencyUnits | string,
  ) {
    return convertMeasurement(
      value,
      from as FrequencyUnits,
      to as FrequencyUnits,
      FrequencyConversions,
      FrequencyAliases,
    );
  },

  convertArray(
    arr: number[],
    from: FrequencyUnits | string,
    to: FrequencyUnits | string,
  ) {
    return convertMeasurementArray(
      arr,
      from as FrequencyUnits,
      to as FrequencyUnits,
      FrequencyConversions,
      FrequencyAliases,
    );
  },
};
