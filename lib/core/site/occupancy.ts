import type { Site } from "./site";

/** Site occupancy (0-1).
 *
 * For ordered sites carrying a partial `species.properties.occu` (falls
 * back to 1 when absent). Shared or vacant positions are first class in
 * `DisorderedStructure`; see `scatterers` for a view over both.
 *  */
export function occupancyOf(site: Site): number {
  const occu = site.species.properties?.occu;

  return typeof occu === "number" ? occu : 1;
}
