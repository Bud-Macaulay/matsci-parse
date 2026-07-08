import { Species } from "@/main";
import { Structure } from "@/main";
import { findSites } from "./findSites";

// matches species.symbol only.

export function findSitesBySpecies(
  structure: Structure,
  species: Species | string,
): number[] {
  const symbol = typeof species === "string" ? species : species.symbol;

  return findSites(structure, (site) => site.species.symbol === symbol);
}
