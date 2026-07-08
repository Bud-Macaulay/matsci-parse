/** A chemical species with a symbol and optional properties. */
export type Species<P extends Record<string, any> = Record<string, any>> = {
  symbol: string;
  properties?: P;
};

/** Create a new Species.
 * @param symbol - Element symbol.
 * @param properties - Optional properties.
 * @returns A new Species. */
export function createSpecies<P extends Record<string, any>>(
  symbol: string,
  properties?: P,
): Species<P> {
  return { symbol, properties };
}
