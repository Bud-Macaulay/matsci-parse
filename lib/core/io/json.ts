import { Structure } from "../structure/structure";
import { createLattice } from "../lattice/lattice";

/** Serializes a Structure to a JSON-serializable object. */
export function toJSON(structure: Structure) {
  return {
    lattice: Array.from(structure.lattice.basis.data),
    sites: structure.sites.map((s) => ({
      species: s.species,
      frac: Array.from(s.frac),
    })),
  };
}

/** Deserializes a Structure from a JSON object. */
export function fromJSON(data: any): Structure {
  return {
    lattice: createLattice(data.lattice),
    sites: data.sites.map((s: any) => ({
      species: s.species,
      frac: new Float64Array(s.frac),
    })),
  };
}
