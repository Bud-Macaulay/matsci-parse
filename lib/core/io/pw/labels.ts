import { getElement } from "../../data/periodictable/atomicData";

/**
 * Element behind a QE species label: the longest leading element symbol,
 * e.g. "Fe1" → "Fe", "Fe_up" → "Fe", "O2" → "O". Falls back to the label.
 */
export function elementFromLabel(label: string): string {
  const letters = /^[A-Za-z]{1,2}/.exec(label)?.[0] ?? "";
  for (const len of [2, 1]) {
    const candidate = letters.slice(0, len);
    if (candidate.length !== len) continue;
    const symbol = candidate[0].toUpperCase() + candidate.slice(1).toLowerCase();
    if (getElement(symbol)) return symbol;
  }
  return label;
}
