import { Structure } from "../structure";
import { volume as latticeVolume } from "../../lattice/volume";

export function volume(structure: Structure): number {
  return latticeVolume(structure.lattice);
}
