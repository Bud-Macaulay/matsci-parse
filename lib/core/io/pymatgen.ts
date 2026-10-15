import { Structure } from "../structure/structure";
import { createLattice } from "../lattice/lattice";
import { volume } from "../lattice/volume";
import { parameters } from "../lattice/parameters";

import { cartesian } from "../site/cartesian";
import { createDisorderedSite } from "../site/disorder";
import {
  isDisordered,
  type DisorderedStructure,
} from "../structure/disordered";
import { createMatrix } from "../matrix/matrix";
import { mul } from "../matrix/operations/mul";

/** Slack when deciding a pymatgen site is fully occupied. */
const FULL_OCCU_TOL = 1e-6;

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

/**
 * Deserializes a pymatgen `Structure` JSON object.
 *
 * Returns an ordered Structure when every site holds one species at full
 * occupancy, otherwise a DisorderedStructure (shared or partially vacant
 * sites); narrow with `isDisordered`.
 */
export function fromPymatgen(
  data: PymatgenStructure,
): Structure | DisorderedStructure {
  const lattice = createLattice(new Float64Array(data.lattice.matrix.flat()));

  for (const site of data.sites) {
    if (site.species.length === 0) {
      throw new Error("Site has no species");
    }
  }

  const ordered = data.sites.every(
    (site) =>
      site.species.length === 1 &&
      Math.abs(site.species[0].occu - 1) <= FULL_OCCU_TOL,
  );

  const extras: { charge?: number; properties?: unknown } = {};
  if (data.charge !== undefined) extras.charge = data.charge;
  if (data.properties !== undefined) extras.properties = data.properties;

  if (!ordered) {
    return {
      ...extras,
      disordered: true,
      lattice,
      sites: data.sites.map((site) =>
        createDisorderedSite(
          site.abc,
          site.species.map((s) => ({ symbol: s.element, fraction: s.occu })),
          site.label !== undefined ? { label: site.label } : undefined,
        ),
      ),
    };
  }

  const sites = data.sites.map((site) => {
    const primary = site.species[0];
    const label = site.label ?? primary.element;

    return {
      species: {
        symbol: primary.element,
        properties: { occu: primary.occu, label },
      },

      frac: new Float64Array(site.abc),
    };
  });

  return { ...extras, lattice, sites };
}

/**
 * Serializes a Structure to a pymatgen `Structure` JSON object. Disordered
 * sites are written as multi-species sites.
 */
export function toPymatgen(
  structure: Structure | DisorderedStructure,
): PymatgenStructure {
  const m = structure.lattice.basis.data;

  const matrix = [
    [m[0], m[1], m[2]],
    [m[3], m[4], m[5]],
    [m[6], m[7], m[8]],
  ];

  const [a, b, c, alpha, beta, gamma] = parameters(structure.lattice);

  const sites = isDisordered(structure)
    ? structure.sites.map((site) => ({
        species: site.occupancy.map((o) => ({
          element: o.symbol,
          occu: o.fraction,
        })),
        abc: Array.from(site.frac),
        properties: {},
        label:
          (site.properties?.label as string | undefined) ??
          site.occupancy
            .map((o) => `${o.symbol}:${o.fraction.toFixed(3)}`)
            .join(", "),
        xyz: Array.from(
          mul(
            createMatrix(1, 3, Array.from(site.frac)),
            structure.lattice.basis,
          ).data,
        ),
      }))
    : structure.sites.map((site) => {
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
