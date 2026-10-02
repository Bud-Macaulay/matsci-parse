import { SymbolToAtomicNumber } from "./atomicData";

/**
 * Species symbols in this library are element symbols (e.g. `"Fe"`), with
 * two tolerated extensions: isotope prefixes (e.g. `"13C"`, `"2H"`) and the
 * legacy hydrogen aliases `"D"` (deuterium) and `"T"` (tritium).
 *
 * Nothing here is isotope-resolved beyond label parsing: masses, scattering
 * lookups, and orderings fall back to the natural element unless a resolver
 * has an explicit per-isotope entry.
 */

/** A parsed species symbol: an element plus an optional isotope mass number. */
export interface ParsedSpeciesSymbol {
  /** The input string as given. */
  input: string;
  /** Canonical element symbol (`"13C"` → `"C"`, `"D"` → `"H"`). */
  element: string;
  /** Isotope mass number when specified (`"13C"` → `13`, `"D"` → `2`). */
  massNumber?: number;
  /** Atomic number of the element, or undefined for unknown symbols. */
  atomicNumber?: number;
}

/** Legacy single-letter aliases for the heavy hydrogen isotopes. */
const HYDROGEN_ALIASES: Record<string, { element: string; massNumber: number }> = {
  D: { element: "H", massNumber: 2 },
  T: { element: "H", massNumber: 3 },
};

/** Leading-digits isotope prefix, e.g. `"13C"` or `"2H"`. */
const ISOTOPE_PATTERN = /^(\d+)([A-Z][a-z]?)$/;

/** Parse a species symbol into its element and optional isotope mass number.
 * @param symbol - Species symbol (e.g. `"Fe"`, `"13C"`, `"D"`).
 * @returns The parsed element, mass number, and atomic number. */
export function parseSpeciesSymbol(symbol: string): ParsedSpeciesSymbol {
  const alias = HYDROGEN_ALIASES[symbol];

  if (alias !== undefined) {
    return {
      input: symbol,
      element: alias.element,
      massNumber: alias.massNumber,
      atomicNumber: SymbolToAtomicNumber.get(alias.element),
    };
  }

  const match = ISOTOPE_PATTERN.exec(symbol);

  if (match !== null) {
    const element = match[2];

    return {
      input: symbol,
      element,
      massNumber: Number(match[1]),
      atomicNumber: SymbolToAtomicNumber.get(element),
    };
  }

  return {
    input: symbol,
    element: symbol,
    atomicNumber: SymbolToAtomicNumber.get(symbol),
  };
}

/** Strip any isotope prefix or alias to the canonical element symbol.
 * @param symbol - Species symbol (e.g. `"13C"`, `"D"`).
 * @returns The element symbol (`"C"`, `"H"`). Unknown symbols pass through. */
export function elementSymbolOf(symbol: string): string {
  return parseSpeciesSymbol(symbol).element;
}

/** Isotope-aware atomic-number lookup.
 * @param symbol - Species symbol (e.g. `"Fe"`, `"13C"`, `"D"`).
 * @returns The atomic number, or undefined for unknown symbols. */
export function atomicNumberOf(symbol: string): number | undefined {
  return parseSpeciesSymbol(symbol).atomicNumber;
}

/** Compare two species symbols in periodic-table order.
 *
 * Sorts by atomic number, then by mass number (specified isotopes before the
 * natural-abundance label), then lexicographically. Unknown symbols sort
 * after known elements.
 */
export function compareSpeciesPtOrder(a: string, b: string): number {
  if (a === b) return 0;

  const pa = parseSpeciesSymbol(a);
  const pb = parseSpeciesSymbol(b);
  const za = pa.atomicNumber ?? Number.POSITIVE_INFINITY;
  const zb = pb.atomicNumber ?? Number.POSITIVE_INFINITY;

  if (za !== zb) return za - zb;
  if (za === Number.POSITIVE_INFINITY) return a.localeCompare(b);

  const ma = pa.massNumber ?? Number.POSITIVE_INFINITY;
  const mb = pb.massNumber ?? Number.POSITIVE_INFINITY;

  if (ma !== mb) return ma - mb;

  return a.localeCompare(b);
}

/** Sort species symbols into periodic-table order (stable).
 * @param symbols - Symbols to order.
 * @returns A new array sorted by atomic number (see {@link compareSpeciesPtOrder}). */
export function sortSpeciesPtOrder<T extends string>(symbols: readonly T[]): T[] {
  return [...symbols].sort(compareSpeciesPtOrder);
}
