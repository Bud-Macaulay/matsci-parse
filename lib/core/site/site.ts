import { Species } from "../species/species";

/** Generic site properties map. */
export type SiteProperties = Record<string, any>;

/** A 3D vector type. */
export type Vec3 = [number, number, number] | Float64Array | number[];

/** A site with a species, fractional coordinates, and optional properties. */
export type Site<P extends SiteProperties = SiteProperties> = {
  species: Species;
  frac: Vec3;
  properties?: P;
};

/** Create a new Site object.
 * @param species - The species at the site.
 * @param frac - Fractional coordinates.
 * @param properties - Optional properties.
 * @returns A new Site. */
export function createSite<P extends SiteProperties>(
  species: Species,
  frac: Vec3,
  properties?: P,
): Site<P> {
  return {
    species,
    frac,
    properties,
  };
}
