import { createLattice } from "../lattice";

import { fractional, cartesian } from "../site";
import { Structure } from "../structure";

/** Parses an OPTIMADE structure data object into a Structure. */
export function fromOptimade(data: any): Structure {
  const lattice = createLattice([
    ...data.attributes.lattice_vectors[0],
    ...data.attributes.lattice_vectors[1],
    ...data.attributes.lattice_vectors[2],
  ]);

  const positions = data.attributes.cartesian_site_positions;
  const species = data.attributes.species_at_sites;

  const sites = positions.map((position: number[], i: number) => ({
    species: {
      symbol: species[i],
    },

    frac: fractional(lattice, new Float64Array(position)),
  }));

  return {
    lattice,
    sites,
  };
}

/** Serializes a Structure to an OPTIMADE-compatible data object. */
export function toOptimade(structure: Structure) {
  const m = structure.lattice.basis.data;

  const species_at_sites = structure.sites.map((site) => site.species.symbol);

  const elements = [...new Set(species_at_sites)].sort();

  return {
    attributes: {
      lattice_vectors: [
        [m[0], m[1], m[2]],
        [m[3], m[4], m[5]],
        [m[6], m[7], m[8]],
      ],

      species_at_sites,

      cartesian_site_positions: structure.sites.map((site) =>
        Array.from(cartesian(structure.lattice, site)),
      ),

      dimension_types: [1, 1, 1],

      nsites: structure.sites.length,

      nelements: elements.length,

      elements,
    },
  };
}
