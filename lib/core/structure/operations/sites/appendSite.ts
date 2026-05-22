import { Structure } from "../../structure";
import { Site } from "../../../site/site";

/**
 * Appends a new site to a structure.
 *
 * Returns a new structure with an additional atom at the end of the sites list.
 *
 * @param structure - The original structure
 * @param site - The new site to add
 * @returns A new structure with the site appended
 *
 * @remarks
 * - The original structure is not modified
 * - Useful for building structures incrementally
 * - Does not validate site position (may be outside [0,1))
 *
 * @example
 * ```typescript
 * const struct = { lattice: cubic(4), sites: [] };
 * const newSite = { species: 'Fe', frac: [0, 0, 0] };
 * const struct2 = appendSite(struct, newSite);
 * ```
 */
export function appendSite(structure: Structure, site: Site): Structure {
  return {
    ...structure,
    sites: [...structure.sites, site],
  };
}
