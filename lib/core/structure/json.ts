import { Structure } from "./structure";
import { createLattice } from "../lattice/lattice";

export function toJSON(structure: Structure) {
  return {
    lattice: structure.lattice.basis.data,
    sites: structure.sites.map((s) => ({
      species: s.species,
      frac: Array.from(s.frac),
    })),
  };
}

export function fromJSON(data: any): Structure {
  return {
    lattice: createLattice(data.lattice),
    sites: data.sites.map((s: any) => ({
      species: s.species,
      frac: new Float64Array(s.frac),
    })),
  };
}
