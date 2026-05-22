export type Species<P extends Record<string, any> = Record<string, any>> = {
  symbol: string;
  properties?: P;
};

export function createSpecies<P extends Record<string, any>>(
  symbol: string,
  properties?: P,
): Species<P> {
  return { symbol, properties };
}
