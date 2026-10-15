import type { Lattice } from "../lattice/lattice";
import type { Site } from "../site/site";
import {
  createDisorderedSite,
  isOrderedSite,
  type DisorderedSite,
} from "../site/disorder";
import { occupancyOf } from "../site/occupancy";
import type { Structure } from "./structure";

/**
 * A periodic structure whose positions may be shared by several species
 * (substitutional disorder) or partially vacant.
 *
 * Not assignable to `Structure` (its sites have no `species`), and vice
 * versa (no `disordered` tag), so ordered-only functions reject it at
 * compile time. Convert explicitly with {@link toDisordered} and
 * {@link toOrdered}, or enumerate orderings with `orderDisorderedStructure`.
 */
export interface DisorderedStructure {
  readonly disordered: true;
  readonly lattice: Lattice;
  readonly sites: DisorderedSite[];
  readonly [key: string]: unknown;
}

/** Narrow a structure that may be disordered. */
export function isDisordered(
  structure: Structure | DisorderedStructure,
): structure is DisorderedStructure {
  return (structure as { disordered?: unknown }).disordered === true;
}

/**
 * Runtime guard for ordered-only entry points, for callers the type system
 * cannot see (plain JS, `any`).
 *
 * @param structure - The structure to check.
 * @param context - Caller name for the error message.
 * @throws If the structure is a DisorderedStructure.
 */
export function assertOrdered(structure: unknown, context: string): void {
  if ((structure as { disordered?: unknown } | null)?.disordered === true) {
    throw new Error(
      `${context}: structure is disordered; convert with toOrdered or enumerate orderings with orderDisorderedStructure first`,
    );
  }
}

/**
 * View an ordered structure as a disordered one: one single-species site
 * per input site, with the fraction taken from `species.properties.occu`
 * (default 1). Species properties other than `occu` are kept.
 */
export function toDisordered(structure: Structure): DisorderedStructure {
  const { sites, ...rest } = structure;
  return {
    ...rest,
    disordered: true,
    sites: sites.map((site) => {
      const { occu: _occu, ...speciesProps } = site.species.properties ?? {};
      return createDisorderedSite(
        site.frac,
        [
          {
            symbol: site.species.symbol,
            fraction: occupancyOf(site),
            ...(site.species.properties ? { properties: speciesProps } : {}),
          },
        ],
        site.properties,
      );
    }),
  };
}

/**
 * Convert a disordered structure whose every site holds one species at full
 * occupancy back to an ordered Structure.
 *
 * @throws If any site is shared or partially vacant.
 */
export function toOrdered(structure: DisorderedStructure): Structure {
  const { sites, disordered: _disordered, ...rest } = structure;
  return {
    ...rest,
    sites: sites.map((site, i): Site => {
      if (!isOrderedSite(site)) {
        throw new Error(
          `toOrdered: site ${i} is disordered (${site.occupancy
            .map((o) => `${o.symbol}:${o.fraction}`)
            .join(", ")})`,
        );
      }
      const [{ symbol, properties }] = site.occupancy;
      return {
        species: properties ? { symbol, properties } : { symbol },
        frac: site.frac,
        ...(site.properties ? { properties: site.properties } : {}),
      };
    }),
  };
}

/** One species' weighted contribution at a position. */
export interface Scatterer {
  symbol: string;
  occupancy: number;
  frac: Site["frac"];
}

/**
 * Flatten an ordered or disordered structure into (species, occupancy,
 * position) entries: one per ordered site (occupancy from
 * `species.properties.occu`, default 1) or per species of a disordered
 * site. Suited to averages that are linear in occupancy, like structure
 * factors.
 */
export function scatterers(
  structure: Structure | DisorderedStructure,
): Scatterer[] {
  if (isDisordered(structure)) {
    return structure.sites.flatMap((site) =>
      site.occupancy.map((o) => ({
        symbol: o.symbol,
        occupancy: o.fraction,
        frac: site.frac,
      })),
    );
  }
  return structure.sites.map((site) => ({
    symbol: site.species.symbol,
    occupancy: occupancyOf(site),
    frac: site.frac,
  }));
}
