import { Species } from "../species/species";

export type SiteProperties = Record<string, any>;

export type Site<P extends SiteProperties = SiteProperties> = {
  species: Species;
  frac: [number, number, number];
  properties?: P;
};

export function createSite<P extends SiteProperties>(
  species: Species,
  frac: [number, number, number],
  properties?: P,
): Site<P> {
  return {
    species,
    frac,
    properties,
  };
}
