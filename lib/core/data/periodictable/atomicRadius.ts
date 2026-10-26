import { vdwRadii } from "./vdwRadii";

/**
 * Van der Waals atomic radius in picometers, keyed by element symbol.
 *
 * Derived from the default (Alvarez) set in {@link ./vdwRadii}, converted
 * from angstrom; see that module for sources and the Bondi alternative.
 * Null marks untabulated values (unknown symbols look up as undefined).
 * Unit: pm.
 */
export const atomicRadii: Readonly<Record<string, number | null>> =
  Object.fromEntries(
    Object.entries(vdwRadii).map(([symbol, r]) => [
      symbol,
      r === null ? null : Math.round(r * 100),
    ]),
  );

/** Look up van der Waals atomic radius in picometers.
 * @param symbol - Element symbol (e.g. "Fe").
 * @returns The value, null where unknown, undefined if unknown symbol. */
export function getAtomicRadius(symbol: string): number | null | undefined {
  return atomicRadii[symbol];
}
