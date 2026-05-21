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
