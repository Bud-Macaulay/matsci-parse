import { Structure } from "../structure";
import { Species } from "../../site/species";

export function getSpecies(structure: Structure): Species[] {
  const species = new Map<string, Species>();

  for (const site of structure.sites) {
    const key = site.species.symbol;

    if (!species.has(key)) {
      species.set(key, site.species);
    }
  }

  return Array.from(species.values());
}

export function getElements(structure: Structure): string[] {
  return getSpecies(structure).map((s) => s.symbol);
}

export function getSpeciesCounts(structure: Structure): Map<string, number> {
  const counts = new Map<string, number>();

  for (const site of structure.sites) {
    const symbol = site.species.symbol;
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  }

  return counts;
}
