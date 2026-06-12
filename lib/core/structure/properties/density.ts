import { Structure } from "../structure";
import { volume } from "./volume";
import { cellMass } from "./cellMass";

// in units amu / Ang^3'd
export function density(structure: Structure): number {
  return cellMass(structure) / volume(structure);
}
