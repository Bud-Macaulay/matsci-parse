import { Species } from "@/main";
import { Structure } from "@/main";
import { findSites } from "./findSites";

export function findSitesBySpecies(
  structure: Structure,
  species: Species,
): number[] {
  return findSites(structure, (site) => site.species === species);
}
