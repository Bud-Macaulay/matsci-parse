import { Structure } from "../../structure";
import { Site } from "../../../site/site";

/**
 * Replaces a site in a structure at the specified index.
 *
 * Returns a new structure with the site at the given index replaced with a new site.
 *
 * @param structure - The original structure
 * @param index - The position of the site to replace (0-based)
 * @param site - The new site to use in place of the old one
 * @returns A new structure with the site replaced
 *
 * @remarks
 * - The original structure is not modified
 * - Only the site at the exact index is affected
 * - Does not validate the index bounds
 *
 * @example
 * ```typescript
 * const struct = {
 *   lattice: cubic(4),
 *   sites: [
 *     { species: 'Fe', frac: [0, 0, 0] },
 *     { species: 'Fe', frac: [0.5, 0.5, 0.5] }
 *   ]
 * };
 * const newSite = { species: 'Ni', frac: [0, 0, 0] };
 * const struct2 = replaceSite(struct, 0, newSite);  // Changes first Fe to Ni
 * ```
 */
export function replaceSite(
  structure: Structure,
  index: number,
  site: Site,
): Structure {
  return {
    ...structure,
    sites: structure.sites.map((s, i) => (i === index ? site : s)),
  };
}
