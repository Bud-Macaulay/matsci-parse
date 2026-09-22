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

/**
 * Map an ABINIT numeric XC code (pspxc) to a functional name.
 *
 * Shared by the PSP8 and FHI adapters. Unknown codes fall back to `xc=<n>`.
 */
export function pspxcToFunctional(pspxc: number): string {
  const map: Record<number, string> = {
    1: "LDA (PW)",
    2: "LDA (PW92)",
    6: "LDA (Wigner)",
    7: "PW92",
    11: "PBE",
    14: "PBEsol",
    23: "B3LYP",
  };
  return map[pspxc] ?? `xc=${pspxc}`;
}

/**
 * Reverse-map a functional name to an ABINIT numeric XC code.
 *
 * Used when writing PSP8 for objects from formats that store the functional
 * as a string (e.g. via a UPF hop). Returns undefined when unknown.
 */
export function functionalToPspxc(functional: string): number | undefined {
  const map: Record<string, number> = {
    "LDA (PW)": 1,
    "LDA (PW92)": 2,
    "LDA (Wigner)": 6,
    PW92: 7,
    PBE: 11,
    PBEsol: 14,
    B3LYP: 23,
  };
  return map[functional];
}
