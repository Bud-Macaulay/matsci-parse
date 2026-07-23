import { PeriodicTable } from "../../data/periodictable/atomicData";

/** Reverse lookup: element symbol → atomic number. */
const SymbolToZ = new Map<string, number>();
for (const [z, info] of Object.entries(PeriodicTable)) {
  SymbolToZ.set(info.symbol, Number(z));
}

/** Return the element symbol for a given atomic number (1-based). Returns "X" if unknown. */
export function guessElement(z: number): string {
  const info = PeriodicTable[Math.round(z)];
  return info?.symbol ?? "X";
}

/** Return the atomic number for a given element symbol. Returns 0 if unknown. */
export function elementToZ(element: string): number {
  return SymbolToZ.get(element) ?? 0;
}
