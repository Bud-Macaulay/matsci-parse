import { Structure } from "../structure/structure";
import { createLattice } from "../lattice/lattice";
import { volume } from "../lattice/volume";
import { parameters } from "../lattice/parameters";

import { cartesian } from "../site/cartesian";

/** A single pymatgen species entry (an element with occupancy). */
export interface PymatgenSpecies {
  element: string;
  occu: number;
}

/** A pymatgen lattice block. */
export interface PymatgenLattice {
  matrix: number[][];
  pbc?: boolean[];
  a?: number;
  b?: number;
  c?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  volume?: number;
  [key: string]: unknown;
}

/** A pymatgen site block. */
export interface PymatgenSite {
  species: PymatgenSpecies[];
  abc: [number, number, number] | number[];
  properties?: Record<string, unknown>;
  label?: string;
  xyz?: [number, number, number] | number[];
  [key: string]: unknown;
}

/** A pymatgen `Structure` serialized via `Structure.to(fmt="json")`. */
export interface PymatgenStructure {
  "@module": string;
  "@class": string;
  charge?: number;
  lattice: PymatgenLattice;
  properties?: Record<string, unknown>;
  sites: PymatgenSite[];
  [key: string]: unknown;
}

function flattenMatrix(matrix: number[][]): number[] {
  const out: number[] = [];

  for (const row of matrix) {
    for (const v of row) {
      out.push(v);
    }
  }

  return out;
}

/** Deserializes a pymatgen `Structure` JSON object into a Structure. */
export function fromPymatgen(data: PymatgenStructure): Structure {
  const lattice = createLattice(new Float64Array(flattenMatrix(data.lattice.matrix)));

  const sites = data.sites.map((site) => {
    const primary = site.species[0];

    if (primary === undefined) {
      throw new Error("Site has no species");
    }

    const label = site.label ?? primary.element;

    return {
      species: {
        symbol: primary.element,
        properties: { occu: primary.occu, label },
      },

      frac: new Float64Array(site.abc),
    };
  });

  const out: Structure & { charge?: number; properties?: unknown } = {
    lattice,
    sites,
  };

  if (data.charge !== undefined) {
    out.charge = data.charge;
  }

  if (data.properties !== undefined) {
    out.properties = data.properties;
  }

  return out;
}

/** Serializes a Structure to a pymatgen `Structure` JSON object. */
export function toPymatgen(structure: Structure): PymatgenStructure {
  const m = structure.lattice.basis.data;

  const matrix = [
    [m[0], m[1], m[2]],
    [m[3], m[4], m[5]],
    [m[6], m[7], m[8]],
  ];

  const [a, b, c, alpha, beta, gamma] = parameters(structure.lattice);

  const sites = structure.sites.map((site) => {
    const props = site.species.properties ?? {};

    const label = (props.label as string) ?? site.species.symbol;
    const occu = (props.occu as number) ?? 1;

    const cart = cartesian(structure.lattice, site);

    return {
      species: [{ element: site.species.symbol, occu }],
      abc: Array.from(site.frac),
      properties: {},
      label,
      xyz: Array.from(cart),
    };
  });

  return {
    "@module": "pymatgen.core.structure",
    "@class": "Structure",
    charge: (structure as Structure & { charge?: number }).charge ?? 0.0,
    lattice: {
      matrix,
      pbc: [true, true, true],
      a,
      b,
      c,
      alpha,
      beta,
      gamma,
      volume: volume(structure.lattice),
    },
    properties:
      (structure as Structure & { properties?: Record<string, unknown> })
        .properties ?? {},
    sites,
  };
}
