import { Structure } from "../structure";
import { volume as latticeVolume } from "../../lattice/volume";

/**
 * Compute the volume of a structure's lattice cell.
 * @param structure - Structure to evaluate.
 * @returns Volume in Ang^3.
 */
export function volume(structure: Structure): number {
  return latticeVolume(structure.lattice);
}
