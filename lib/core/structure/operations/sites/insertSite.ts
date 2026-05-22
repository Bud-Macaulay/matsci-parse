import { Structure } from "../../structure";
import { Site } from "../../../site/site";

/**
 * Inserts a site at a specific index in the structure.
 *
 * Returns a new structure with a site inserted at the specified position,
 * shifting subsequent sites forward.
 *
 * @param structure - The original structure
 * @param index - The position to insert at (0-based)
 * @param site - The site to insert
 * @returns A new structure with the site inserted
 *
 * @remarks
 * - The original structure is not modified
 * - Index should be in range [0, sites.length] (end is valid for append)
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
 * const newSite = { species: 'C', frac: [0.5, 0, 0] };
 * const struct2 = insertSite(struct, 1, newSite);  // Inserts at position 1
 * ```
 */
export function insertSite(
  structure: Structure,
  index: number,
  site: Site,
): Structure {
  return {
    ...structure,
    sites: [
      ...structure.sites.slice(0, index),
      site,
      ...structure.sites.slice(index),
    ],
  };
}
