import { convertMeasurement, convertMeasurementArray } from "./converter";

export type LengthUnits =
  | "angstrom"
  | "bohr"
  | "nm"
  | "pm"
  | "cm"
  | "m"
  | "um"
  | "fm";

const LengthConversions: Record<LengthUnits, number> = {
  angstrom: 1,
  bohr: 0.529177,
  nm: 10,
  pm: 0.01,
  um: 1e4,
  cm: 1e8,
  m: 1e10,
  fm: 1e-5,
};

const LengthAliases: Record<string, LengthUnits> = {
  Å: "angstrom",
  μm: "um",
};

export const LengthUnitSystem = {
  conversions: LengthConversions,
  aliases: LengthAliases,

  convert(value: number, from: LengthUnits | string, to: LengthUnits | string) {
    return convertMeasurement(
      value,
      from as LengthUnits,
      to as LengthUnits,
      LengthConversions,
      LengthAliases,
    );
  },

  convertArray(
    arr: number[],
    from: LengthUnits | string,
    to: LengthUnits | string,
  ) {
    return convertMeasurementArray(
      arr,
      from as LengthUnits,
      to as LengthUnits,
      LengthConversions,
      LengthAliases,
    );
  },
};
