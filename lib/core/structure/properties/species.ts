import { Structure } from "../structure";
import { Species } from "../../species/species";
import { compareSpeciesPtOrder } from "../../data/periodictable/isotopes";

/**
 * Collect unique Species from a structure, in periodic-table order.
 * @param structure - Structure to evaluate.
 * @returns Array of unique Species sorted by atomic number.
 */
export function getSpecies(structure: Structure): Species[] {
  const species = new Map<string, Species>();

  for (const site of structure.sites) {
    const key = site.species.symbol;

    if (!species.has(key)) {
      species.set(key, site.species);
    }
  }

  return Array.from(species.values()).sort((a, b) =>
    compareSpeciesPtOrder(a.symbol, b.symbol),
  );
}

/**
 * Collect unique element symbols from a structure, in periodic-table order.
 * @param structure - Structure to evaluate.
 * @returns Array of element symbols sorted by atomic number.
 */
export function getElements(structure: Structure): string[] {
  return getSpecies(structure).map((s) => s.symbol);
}

/**
 * Count occurrences of each species symbol in a structure.
 * @param structure - Structure to evaluate.
 * @returns Map of element symbols to occurrence counts.
 */
export function getSpeciesCounts(structure: Structure): Map<string, number> {
  const counts = new Map<string, number>();

  for (const site of structure.sites) {
    const symbol = site.species.symbol;
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  }

  return counts;
}
