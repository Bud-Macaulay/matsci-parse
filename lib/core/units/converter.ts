/**
 * Convert a single measurement between units.
 * @param value - Numeric value to convert.
 * @param from - Source unit.
 * @param to - Target unit.
 * @param conversions - Map of unit to base conversion factor.
 * @param aliases - Optional alias map for unit names.
 * @returns Converted value.
 */
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

/**
 * Convert an array of measurements between units.
 * @param arr - Array of numeric values to convert.
 * @param from - Source unit.
 * @param to - Target unit.
 * @param conversions - Map of unit to base conversion factor.
 * @param aliases - Optional alias map for unit names.
 * @returns Array of converted values.
 */
export function convertMeasurementArray<T extends string>(
  arr: number[],
  from: T,
  to: T,
  conversions: Record<T, number>,
  aliases?: Record<string, T>,
): number[] {
  return arr.map((v) => convertMeasurement(v, from, to, conversions, aliases));
}
