import { Structure } from "../../structure";
import { Site } from "../../../site/site";

/**
 * Removes a site from a structure at the specified index.
 *
 * Returns a new structure with the site at the given index removed.
 *
 * @param structure - The original structure
 * @param index - The position of the site to remove (0-based)
 * @returns A new structure with the site removed
 *
 * @remarks
 * - The original structure is not modified
 * - Does not validate the index; out-of-bounds indices are silently ignored
 * - Adjacent sites are shifted to fill the gap
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
 * const struct2 = removeSite(struct, 0);  // Removes first site
 * // Now has only one site
 * ```
 */
export function removeSite(structure: Structure, index: number): Structure {
  return {
    ...structure,
    sites: structure.sites.filter((_, i) => i !== index),
  };
}
