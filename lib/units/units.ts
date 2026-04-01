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
  angstrom: 1, // canonical
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

type EnergyUnits = "eV" | "Hartree" | "kJ/mol" | "kcal/mol";

const EnergyConversions: Record<EnergyUnits, number> = {
  eV: 1, // canonical
  Hartree: 27.2114,
  "kJ/mol": 0.0103643,
  "kcal/mol": 0.0433641,
};

const EnergyAliases: Record<string, EnergyUnits> = {
  Ha: "Hartree",
  ev: "eV",
  electronvolt: "eV",
};

export function convertMeasurement<T extends string>(
  value: number,
  from: T,
  to: T,
  conversions: Record<T, number>,
  aliases?: Record<string, T>,
): number {
  const resolve = (u: string) => (aliases?.[u] ?? u) as T;
  const fromUnit = resolve(from);
  const toUnit = resolve(to);
  if (fromUnit === toUnit) return value;
  const valueInBase = value * conversions[fromUnit];
  return valueInBase / conversions[toUnit];
}

export function convertMeasurementArray<T extends string>(
  arr: number[],
  from: T,
  to: T,
  conversions: Record<T, number>,
  aliases?: Record<string, T>,
): number[] {
  return arr.map((v) => convertMeasurement(v, from, to, conversions, aliases));
}

export const LengthUnitSystem = {
  conversions: LengthConversions,
  aliases: LengthAliases,

  convert(
    value: number,
    from: LengthUnits | string,
    to: LengthUnits | string,
  ): number {
    const resolve = (u: string) => this.aliases[u] ?? u;
    const fromUnit = resolve(from);
    const toUnit = resolve(to);
    if (fromUnit === toUnit) return value;
    return (
      (value * this.conversions[fromUnit as LengthUnits]) /
      this.conversions[toUnit as LengthUnits]
    );
  },

  convertArray(
    arr: number[],
    from: LengthUnits | string,
    to: LengthUnits | string,
  ): number[] {
    return arr.map((v) => this.convert(v, from, to));
  },
};
