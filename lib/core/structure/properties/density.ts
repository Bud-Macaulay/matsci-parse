import { Structure } from "../structure";
import { volume } from "./volume";
import { cellMass } from "./cellMass";

/**
 * Compute the density of a structure.
 * @param structure - Structure to evaluate.
 * @returns Density in amu/Ang^3.
 */
export function density(structure: Structure): number {
  const vol = volume(structure);

  if (vol < 1e-300) {
    throw new Error("Degenerate cell has no volume");
  }

  return cellMass(structure) / vol;
}
