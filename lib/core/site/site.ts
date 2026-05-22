import { Species } from "../species/species";

export type SiteProperties = Record<string, any>;

export type Vec3 = [number, number, number] | Float64Array | number[];

export type Site<P extends SiteProperties = SiteProperties> = {
  species: Species;
  frac: Vec3;
  properties?: P;
};

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
