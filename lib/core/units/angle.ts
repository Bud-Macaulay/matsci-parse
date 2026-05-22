import { convertMeasurement, convertMeasurementArray } from "./converter";

export type AngleUnits = "rad" | "deg" | "grad";

const AngleConversions: Record<AngleUnits, number> = {
  rad: 1,
  deg: Math.PI / 180,
  grad: Math.PI / 200,
};

const AngleAliases: Record<string, AngleUnits> = {
  "°": "deg",
  deg: "deg",
  rad: "rad",
  gon: "grad",
};

export const AngleUnitSystem = {
  conversions: AngleConversions,
  aliases: AngleAliases,

  convert(value: number, from: AngleUnits | string, to: AngleUnits | string) {
    return convertMeasurement(
      value,
      from as AngleUnits,
      to as AngleUnits,
      AngleConversions,
      AngleAliases,
    );
  },

  convertArray(
    arr: number[],
    from: AngleUnits | string,
    to: AngleUnits | string,
  ) {
    return convertMeasurementArray(
      arr,
      from as AngleUnits,
      to as AngleUnits,
      AngleConversions,
      AngleAliases,
    );
  },
};
