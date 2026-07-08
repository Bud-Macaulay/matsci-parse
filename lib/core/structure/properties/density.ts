import { Structure } from "../structure";
import { volume } from "./volume";
import { cellMass } from "./cellMass";

/**
 * Compute the density of a structure.
 * @param structure - Structure to evaluate.
 * @returns Density in amu/Ang^3.
 */
export function density(structure: Structure): number {
  return cellMass(structure) / volume(structure);
}
