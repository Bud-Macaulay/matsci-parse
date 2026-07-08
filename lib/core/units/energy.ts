import { convertMeasurement, convertMeasurementArray } from "./converter";

/** Supported energy unit identifiers. */
export type EnergyUnits = "eV" | "Hartree" | "kJ/mol" | "kcal/mol";

const EnergyConversions: Record<EnergyUnits, number> = {
  eV: 1,
  Hartree: 27.2114,
  "kJ/mol": 0.0103643,
  "kcal/mol": 0.0433641,
};

const EnergyAliases: Record<string, EnergyUnits> = {
  Ha: "Hartree",
  ev: "eV",
  electronvolt: "eV",
};

/** Unit system for energy conversions with eV as base. */
export const EnergyUnitSystem = {
  conversions: EnergyConversions,
  aliases: EnergyAliases,

  convert(value: number, from: EnergyUnits | string, to: EnergyUnits | string) {
    return convertMeasurement(
      value,
      from as EnergyUnits,
      to as EnergyUnits,
      EnergyConversions,
      EnergyAliases,
    );
  },

  convertArray(
    arr: number[],
    from: EnergyUnits | string,
    to: EnergyUnits | string,
  ) {
    return convertMeasurementArray(
      arr,
      from as EnergyUnits,
      to as EnergyUnits,
      EnergyConversions,
      EnergyAliases,
    );
  },
};
