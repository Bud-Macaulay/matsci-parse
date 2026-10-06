import type { Site } from "./site";

/** Site occupancy (0-1).
 *
 * matsci-parse doesn't natively support occupations as a first-class data
 * field but we attempt to with `occu`: readers stash it on
 * `species.properties.occu`, calculators fall back to 1 when absent.
 *
 * As of current this is only used in the diffraction module, but if extended may become a first class field.
 *  */
export function occupancyOf(site: Site): number {
  const occu = site.species.properties?.occu;

  return typeof occu === "number" ? occu : 1;
}
