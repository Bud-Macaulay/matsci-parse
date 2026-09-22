/**
 * Convert a single measurement between units.
 *
 * Note on floating point: conversion routes through the base unit, so each
 * call applies two roundings (`value * fromFactor / toFactor`). The result
 * can differ by 1 ulp from multiplying by a direct factor (e.g.
 * `convert(v, "Hartree", "Rydberg")` is not bit-identical to `v * 2` for all
 * doubles). Callers that need bit-exact round-trips should resolve the
 * factor once (e.g. `convert(1, from, to)`) and apply it in a tight loop
 * instead of converting per value — which is also much faster.
 *
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
 *
 * Same floating-point caveat as convertMeasurement applies per element; in
 * addition this allocates a plain number[] and performs map lookups per
 * value, so for large typed arrays prefer resolving the factor once and
 * looping directly.
 *
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
