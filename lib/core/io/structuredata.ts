import { Structure } from "../structure/structure";
import { createLattice } from "../lattice/lattice";

import { cartesian } from "../site/cartesian";
import { fractional } from "../site/fractional";

export interface AiiDASite {
  position: [number, number, number];
  symbols: string[];
}

export interface StructureData {
  cell: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ];
  kinds: [];
  sites: AiiDASite[];
}

/**
 * Parses a crystal structure from AiiDA/StructureData representation.
 *
 * Converts AiiDA StructureData format to a Structure object.
 * Used for compatibility with AiiDA workflows.
 *
 * @param data - An AiiDA StructureData object with `cell` (3×3) and `sites` array
 * @returns A new Structure object
 * @throws Error if cell or sites data is malformed
 *
 * @remarks
 * - `cell`: 3×3 array of Cartesian lattice vectors
 * - `sites`: Array of AiiDASite objects with position and species
 * - `kinds`: Array defining species information (symbol mapping)
 * - Converts Cartesian coordinates to fractional internally
 * - Used primarily for VASP and other DFT workflow integration
 *
 * @example
 * ```typescript
 * const aiidaData = {
 *   cell: [[4.05, 0, 0], [0, 4.05, 0], [0, 0, 4.05]],
 *   kinds: [{ name: 'Al', symbol: 'Al' }],
 *   sites: [
 *     { position: [0, 0, 0], symbols: ['Al'] },
 *     { position: [2.025, 2.025, 2.025], symbols: ['Al'] }
 *   ]
 * };
 * const structure = fromStructureData(aiidaData);
 * ```
 */
export function fromStructureData(data: StructureData): Structure {
  const lattice = createLattice([
    ...data.cell[0],
    ...data.cell[1],
    ...data.cell[2],
  ]);

  const kindMap = new Map(data.kinds.map((kind: any) => [kind.name, kind]));

  const sites = data.sites.map((site: any) => {
    const kind = kindMap.get(site.kind_name);

    if (!kind) {
      throw new Error(`Unknown kind "${site.kind_name}"`);
    }

    return {
      species: {
        symbol: kind.symbols[0],
      },

      frac: fractional(lattice, new Float64Array(site.position)),
    };
  });

  return {
    lattice,
    sites,
  };
}

export function toStructureData(structure: Structure) {
  const m = structure.lattice.basis.data;

  const symbols = [...new Set(structure.sites.map((s) => s.species.symbol))];

  const kinds = symbols.map((symbol) => ({
    name: symbol,
    symbols: [symbol],
  }));

  return {
    cell: [
      [m[0], m[1], m[2]],
      [m[3], m[4], m[5]],
      [m[6], m[7], m[8]],
    ],

    kinds,

    sites: structure.sites.map((site) => ({
      kind_name: site.species.symbol,

      position: Array.from(cartesian(structure.lattice, site)),
    })),

    pbc1: true,
    pbc2: true,
    pbc3: true,
  };
}
