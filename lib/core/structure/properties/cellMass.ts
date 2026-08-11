import { Structure } from "../structure";
import { Site } from "../../site/site";
import { getElement } from "@/core/data/periodictable/atomicData";

function siteMass(site: Site): number {
  const siteMass = site.properties?.mass;

  if (typeof siteMass === "number") {
    return siteMass;
  }

  const speciesMass = site.species.properties?.mass;

  if (typeof speciesMass === "number") {
    return speciesMass;
  }

  const element = getElement(site.species.symbol);

  if (!element) {
    throw new Error(`Unknown element: ${site.species.symbol}`);
  }

  return element.mass;
}

/**
 * Sum the masses of all sites in the structure.
 * @param structure - Structure to evaluate.
 * @returns Total mass in atomic mass units.
 */
export function cellMass(structure: Structure): number {
  let mass = 0;

  for (const site of structure.sites) {
    mass += siteMass(site);
  }

  return mass;
}
