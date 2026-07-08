import { Species } from "@/main";
import { Structure } from "@/main";
import { findSites } from "./findSites";

// matches species.symbol only.

/** Find site indices whose species symbol matches the given species or string. */
export function findSitesBySpecies(
  structure: Structure,
  species: Species | string,
): number[] {
  const symbol = typeof species === "string" ? species : species.symbol;

  return findSites(structure, (site) => site.species.symbol === symbol);
}
